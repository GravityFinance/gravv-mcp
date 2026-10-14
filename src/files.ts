/**
 * Files in and out of the API without passing through the model's context.
 *
 * Uploads: a tool listed in UPLOADS (curation.ts) takes `file_path` beside `content`.
 * The server reads the file, checks that it is a regular file within the size limit and
 * that its first bytes are one of the allowed types, and sends it as base64. A model that
 * had to produce the base64 itself would carry the whole file in its context, and often
 * corrupt it.
 *
 * Downloads: a tool listed in DOWNLOADS returns a file as a data URI. The server writes
 * it under the download directory (0700, file 0600) and returns the path instead.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { DOWNLOADS, UPLOADS, type FileKind, type UploadSpec } from "./curation.ts";

export class FileArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileArgumentError";
  }
}

const MIME: Record<FileKind, string> = { pdf: "application/pdf", png: "image/png", jpeg: "image/jpeg" };
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" };

/** The file type from its first bytes, or undefined when it is none of the known ones. */
export function sniff(bytes: Uint8Array): FileKind | undefined {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts([0xff, 0xd8, 0xff])) return "jpeg";
  return undefined;
}

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/** Read and check one file for an upload slot, and fill its fields. */
function fill(slot: Record<string, unknown>, spec: UploadSpec, where: string): void {
  const raw = slot.file_path;
  if (raw === undefined) return;
  delete slot.file_path;
  if (typeof raw !== "string" || raw.trim() === "") throw new FileArgumentError(`${where}file_path must be a path`);
  if (slot[spec.content] !== undefined) {
    throw new FileArgumentError(`${where}send file_path or ${spec.content}, not both`);
  }

  const path = resolve(raw);
  let info;
  try {
    info = statSync(path);
  } catch {
    throw new FileArgumentError(`${where}file_path ${raw} cannot be read`);
  }
  if (!info.isFile()) throw new FileArgumentError(`${where}file_path ${raw} is not a regular file`);
  if (info.size === 0) throw new FileArgumentError(`${where}file_path ${raw} is empty`);
  if (info.size > spec.maxBytes) {
    throw new FileArgumentError(
      `${where}file_path ${raw} is ${size(info.size)}; this field takes at most ${size(spec.maxBytes)}`,
    );
  }

  const bytes = readFileSync(path);
  const kind = sniff(bytes);
  if (!kind || !spec.kinds.includes(kind)) {
    throw new FileArgumentError(
      `${where}file_path ${raw} is not ${spec.kinds.map((k) => k.toUpperCase()).join(", ")} (read from the file's ` +
        `first bytes, not its name)`,
    );
  }

  if (spec.typeField) {
    const declared = slot[spec.typeField];
    if (declared === undefined) slot[spec.typeField] = MIME[kind];
    else if (declared !== MIME[kind]) {
      throw new FileArgumentError(`${where}${spec.typeField} is ${String(declared)}, but the file is ${MIME[kind]}`);
    }
  }
  if (spec.nameField && slot[spec.nameField] === undefined) slot[spec.nameField] = basename(path);
  slot[spec.content] = bytes.toString("base64");
}

/** Every object at `at` in a value: "" is the value itself, `[]` steps into array items. */
function slots(value: unknown, at: string, where = ""): Array<{ slot: Record<string, unknown>; where: string }> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [];
  if (at === "") return [{ slot: value as Record<string, unknown>, where }];
  const [head = "", ...rest] = at.split(".");
  const tail = rest.join(".");
  const isArray = head.endsWith("[]");
  const key = isArray ? head.slice(0, -2) : head;
  const next = (value as Record<string, unknown>)[key];
  if (!isArray) return slots(next, tail, `${where}${key}.`);
  if (!Array.isArray(next)) return [];
  return next.flatMap((item, i) => slots(item, tail, `${where}${key}[${i}].`));
}

/** Whether a tool takes files, so the server copies its arguments only when it must. */
export function takesFiles(toolName: string): boolean {
  return Object.hasOwn(UPLOADS, toolName);
}

/**
 * The arguments with every `file_path` replaced by the file's content. The caller's
 * object is not changed. Throws FileArgumentError for a file that cannot be sent.
 */
export function resolveUploads(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const specs = UPLOADS[toolName];
  if (!specs) return args;
  const copy = structuredClone(args);
  for (const spec of specs) {
    for (const { slot, where } of slots(copy, spec.at)) fill(slot, spec, where ? `${where.slice(0, -1)}: ` : "");
  }
  return copy;
}

/** Where downloads go: GRAVV_DOWNLOAD_DIR / --download-dir, else a folder in the OS temp dir. */
export function defaultDownloadDir(): string {
  return join(tmpdir(), "gravv-mcp-downloads");
}

/** A file-name part made only of safe characters, so an argument cannot climb out of the folder. */
function safePart(value: unknown): string {
  return String(value ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 64) || "file";
}

/**
 * For a DOWNLOADS tool, write the file in `data` to the download directory and return
 * `data` without it, plus `saved_to`. Other tools and answers without the file pass
 * through unchanged.
 */
export function saveDownload(
  toolName: string,
  args: Record<string, unknown>,
  data: unknown,
  dir: string,
): unknown {
  const spec = DOWNLOADS[toolName];
  if (!spec || data === null || typeof data !== "object" || Array.isArray(data)) return data;
  const record = data as Record<string, unknown>;
  const content = record[spec.content];
  if (typeof content !== "string") return data;

  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(content);
  const mime = match?.[1] ?? (typeof record.content_type === "string" ? record.content_type : "");
  const bytes = match ? Buffer.from(match[3] ?? "", match[2] ? "base64" : "utf8") : Buffer.from(content, "base64");
  const ext = EXT[mime] ?? "bin";

  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const name = `${spec.prefix}-${spec.nameFrom.map((k) => safePart(args[k])).join("-")}.${ext}`;
  const path = join(dir, name);
  writeFileSync(path, bytes, { mode: 0o600 });
  chmodSync(path, 0o600); // an existing file keeps its old mode on overwrite

  const { [spec.content]: _omitted, ...rest } = record;
  return { ...rest, saved_to: path, saved_bytes: bytes.length };
}
