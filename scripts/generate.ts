/**
 * Generate MCP tool definitions from the vendored OpenAPI specs.
 *
 *   specs/*.yaml  ->  src/generated/tools.ts
 *
 * Why generate rather than hand-write: the specs already describe every operation's
 * shape and they are what builds the public docs. Hand-writing tools would guarantee
 * drift between what the docs promise and what the MCP does. Everything that *cannot*
 * be derived from a spec — names, ordering, blocklist — lives in src/curation.ts.
 *
 * MCP tools take one flat arguments object, so each operation's path params, query
 * params, and request body are merged into a single JSON Schema. Collisions between a
 * parameter and a body property are reported as errors rather than silently resolved.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { MANUAL_TOOLS } from "../src/manual-tools.ts";
import {
  NAMES,
  BLOCKED,
  BLOCKED_TOOL_NAMES,
  OUTCOME_LOOKUPS,
  UPPER_CASE_ARGS,
  PREREQUISITES,
  ENUM_RESTRICTIONS,
  DESCRIPTION_OVERRIDES,
  MONEY_OPS,
  CONFIRM_OPS,
  opKey,
  isMoneyOp,
  needsConfirmation,
  needsIdempotencyKey,
  isSandboxOnly,
  SANDBOX_ONLY,
  FLATTEN_BODY_VARIANTS,
  UPLOADS,
  DOWNLOADS,
  type Toolset,
  type UploadSpec,
} from "../src/curation.ts";

/**
 * Remove values from every `enum` in a schema, wherever they appear.
 *
 * Walking the whole schema rather than addressing a fixed path — the enum in question
 * sits inside a `oneOf` branch, and pinning an index would break silently the next time
 * the specification is restructured. Returns how many enums were touched so the caller
 * can fail the build if a restriction stops matching anything.
 */
function restrictEnums(node: any, remove: string[], depth = 0): number {
  if (node === null || typeof node !== "object" || depth > 30) return 0;
  if (Array.isArray(node)) return node.reduce((n, x) => n + restrictEnums(x, remove, depth + 1), 0);

  let touched = 0;
  if (Array.isArray(node.enum) && node.enum.some((v: unknown) => remove.includes(v as string))) {
    node.enum = node.enum.filter((v: unknown) => !remove.includes(v as string));
    touched++;
  }

  // Examples are shown to the model verbatim, and they do not live on the same node as
  // the enum — `methods.example` sits a level above `methods.items.enum`. Cleaning only
  // alongside the enum left the removed values on display, so sweep examples separately
  // wherever they appear.
  if (Array.isArray(node.example)) {
    const kept = node.example.filter((v: unknown) => !remove.includes(v as string));
    if (kept.length !== node.example.length) {
      if (kept.length > 0) node.example = kept;
      else delete node.example;
    }
  } else if (typeof node.example === "string" && remove.includes(node.example)) {
    delete node.example;
  }

  for (const v of Object.values(node)) touched += restrictEnums(v, remove, depth + 1);
  return touched;
}

/**
 * Add `file_path` beside each upload slot in a tool schema and make its content optional.
 * Returns a problem line for a slot or content field the schema does not have, so a spec
 * change that moves the file fields fails generation instead of silently dropping them.
 */
function addFilePaths(name: string, schema: any, specs: UploadSpec[]): string[] {
  const problems: string[] = [];
  for (const spec of specs) {
    let node = schema;
    for (const part of spec.at ? spec.at.split(".") : []) {
      const isArray = part.endsWith("[]");
      node = node?.properties?.[isArray ? part.slice(0, -2) : part];
      if (isArray) node = node?.items;
    }
    if (!node?.properties?.[spec.content]) {
      problems.push(`${name}: UPLOADS names "${spec.at || "(top level)"}.${spec.content}", which the schema does not have`);
      continue;
    }
    if (node.properties.file_path) {
      problems.push(`${name}: the spec declares file_path at "${spec.at || "(top level)"}", which collides with the upload argument`);
      continue;
    }
    const kinds = spec.kinds.map((k) => k.toUpperCase()).join(", ");
    const mb = spec.maxBytes >= 1024 * 1024 ? `${spec.maxBytes / (1024 * 1024)} MB` : `${spec.maxBytes / 1024} KB`;
    const others = [spec.nameField, spec.typeField].filter((f): f is string => Boolean(f)).join(" and ");
    node.properties.file_path = {
      type: "string",
      minLength: 1,
      description:
        `Path of a local file to send instead of ${spec.content}. The server reads it, checks that it is ${kinds} ` +
        `(by its bytes, not its name) and at most ${mb}, and sends it as ${spec.content}` +
        (others ? `, filling ${others} when you leave them out` : "") +
        `. Send file_path or ${spec.content}, not both` +
        (others ? `; with ${spec.content}, send ${others} yourself.` : "."),
    };
    // The fields the server fills are optional in the schema: required only with content.
    const filled = [spec.content, spec.nameField, spec.typeField];
    if (Array.isArray(node.required)) node.required = node.required.filter((r: string) => !filled.includes(r));
  }
  return problems;
}

/** Every `description` string in a schema, for checking what text the model would see. */
function descriptions(node: any, depth = 0): string[] {
  if (node === null || typeof node !== "object" || depth > 30) return [];
  if (Array.isArray(node)) return node.flatMap((x) => descriptions(x, depth + 1));
  const own = typeof node.description === "string" ? [node.description] : [];
  return [...own, ...Object.values(node).flatMap((v) => descriptions(v, depth + 1))];
}

const squash = (text: string) => text.trim().replace(/\s+/g, " ");

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SPECS = join(root, "specs");
const OUT = join(root, "src", "generated", "tools.ts");

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

type Json = Record<string, any>;

/** Resolve internal `$ref`s and flatten `allOf`. Cycles resolve to a bare object. */
function deref(node: any, doc: Json, seen: Set<string> = new Set(), depth = 0): any {
  if (node === null || typeof node !== "object") return node;
  if (depth > 40) return {};

  if (Array.isArray(node)) return node.map((n) => deref(n, doc, seen, depth + 1));

  if (typeof node.$ref === "string") {
    const ref: string = node.$ref;
    if (!ref.startsWith("#/")) return {};
    if (seen.has(ref)) return {}; // cycle — e.g. an address that nests itself
    const target = ref
      .slice(2)
      .split("/")
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key.replace(/~1/g, "/").replace(/~0/g, "~")]), doc);
    if (target == null) return {};
    const { $ref, ...siblings } = node;
    return { ...deref(target, doc, new Set([...seen, ref]), depth + 1), ...deref(siblings, doc, seen, depth + 1) };
  }

  const out: Json = {};
  for (const [k, v] of Object.entries(node)) out[k] = deref(v, doc, seen, depth + 1);

  // allOf is composition — merge the branches into the parent so the model sees one
  // flat schema rather than a construct most MCP clients ignore. The merged node takes
  // its type from the branches: a scalar wrapped in allOf (a string enum $ref with a
  // sibling description) must stay a string, not become an object with an enum.
  if (Array.isArray(out.allOf)) {
    const merged: Json = {};
    const props: Json = {};
    const req: string[] = [];
    let hasProps = false;
    for (const branch of out.allOf) {
      if (branch?.type && !merged.type) merged.type = branch.type;
      if (branch?.properties) {
        hasProps = true;
        Object.assign(props, branch.properties);
      }
      if (Array.isArray(branch?.required)) req.push(...branch.required);
      for (const [k, v] of Object.entries(branch ?? {})) {
        if (!["properties", "required", "type", "allOf"].includes(k) && !(k in merged)) merged[k] = v;
      }
    }
    delete out.allOf;
    const { properties, required, ...rest } = out;
    const allRequired = [...new Set([...req, ...(Array.isArray(required) ? required : [])])];
    const { type, ...others } = merged;
    if (!hasProps && !properties && (type ?? rest.type) !== "object") {
      // A scalar or array: keep its own type, with no object keywords added.
      return { ...(type ? { type } : {}), ...others, ...rest, ...(allRequired.length ? { required: allRequired } : {}) };
    }
    return {
      type: type ?? "object",
      properties: { ...props, ...(properties ?? {}) },
      required: allRequired,
      ...others,
      ...rest,
    };
  }

  return out;
}

/**
 * Strip keywords that add tokens without helping the model produce valid input.
 *
 * Spec extensions (`x-*`) go too. Two of them change the schema first: a property marked
 * `x-not-yet-live: true` is removed (and dropped from `required`), and enum values listed in
 * `x-not-yet-live-values` are removed, because the API does not accept them yet and a tool
 * must not offer what would fail.
 */
function slim(schema: any, depth = 0): any {
  if (schema === null || typeof schema !== "object" || depth > 25) return schema;
  if (Array.isArray(schema)) return schema.map((s) => slim(s, depth + 1));

  const DROP = new Set(["xml", "externalDocs", "discriminator", "readOnly", "writeOnly", "deprecated", "$schema"]);
  const notYetLive = (s: any) => s !== null && typeof s === "object" && s["x-not-yet-live"] === true;
  const out: Json = {};
  for (const [k, v] of Object.entries(schema)) {
    if (DROP.has(k) || k.startsWith("x-")) continue;
    if (k === "example" && "examples" in schema) continue;
    if (k === "properties" && v !== null && typeof v === "object" && !Array.isArray(v)) {
      // A map of names to schemas, not a schema: its keys are field names, never keywords.
      const props: Json = {};
      for (const [name, sub] of Object.entries(v as Json)) if (!notYetLive(sub)) props[name] = slim(sub, depth + 1);
      // A map emptied by the removal is dropped, so an open form (v2 data.root) stays open
      // rather than claiming to declare no fields at all.
      if (Object.keys(props).length > 0 || Object.keys(v as Json).length === 0) out.properties = props;
      continue;
    }
    out[k] = slim(v, depth + 1);
  }
  if (Array.isArray(out.required) && out.properties) {
    const gone = Object.keys(schema.properties ?? {}).filter((name) => notYetLive(schema.properties[name]));
    out.required = out.required.filter((r: string) => !gone.includes(r));
  }
  const pending = schema["x-not-yet-live-values"];
  if (Array.isArray(out.enum) && Array.isArray(pending)) out.enum = out.enum.filter((e: unknown) => !pending.includes(e));
  return out;
}

/**
 * Merges two schemas for the same field from different body shapes. Objects keep every
 * property either declares (merged the same way, all-level deep), required only where both
 * require it, and stay open if either is open. Arrays merge their items. An enum stays only
 * when both have one, as the union of their values.
 */
function mergeShapes(a: Json, b: Json): Json {
  if (!a || typeof a !== "object") return b;
  if (!b || typeof b !== "object") return a;
  const out: Json = { ...a };
  if (Array.isArray(a.enum) && Array.isArray(b.enum)) out.enum = [...new Set([...(a.enum as unknown[]), ...(b.enum as unknown[])])];
  else delete out.enum;
  if (a.properties || b.properties) {
    const props: Json = { ...((a.properties as Json) ?? {}) };
    for (const [k, v] of Object.entries((b.properties as Json) ?? {})) props[k] = k in props ? mergeShapes(props[k] as Json, v as Json) : v;
    out.properties = props;
    const ra = new Set<string>((a.required as string[]) ?? []);
    const both = ((b.required as string[]) ?? []).filter((r) => ra.has(r));
    if (both.length) out.required = both;
    else delete out.required;
    if (a.additionalProperties === false && b.additionalProperties === false) out.additionalProperties = false;
    else if (a.additionalProperties !== undefined || b.additionalProperties !== undefined) {
      out.additionalProperties = a.additionalProperties === false ? b.additionalProperties : a.additionalProperties;
    }
  }
  if (a.items && b.items) out.items = mergeShapes(a.items as Json, b.items as Json);
  for (const k of ["anyOf", "oneOf", "not"]) delete out[k];
  return out;
}

/**
 * Turns a request body whose `oneOf` lists object shapes into one object with every field
 * any shape declares (see mergeShapes), required only where every shape requires it. The
 * returned text names each shape and the fields it requires, for the tool description.
 * Returns undefined for any other body. Only tools in FLATTEN_BODY_VARIANTS use it.
 */
function flattenVariants(body: Json): { body: Json; shapes: string } | undefined {
  const variants = body?.oneOf as Json[] | undefined;
  if (!Array.isArray(variants) || !variants.every((v) => v?.type === "object" && v.properties)) return undefined;
  let flat: Json = { type: "object", properties: { ...((body.properties as Json) ?? {}) } };
  for (const v of variants) {
    flat = mergeShapes(flat, { type: "object", properties: v.properties, additionalProperties: v.additionalProperties });
  }
  const requiredSets = variants.map((v) => new Set<string>((v.required as string[]) ?? []));
  const inEvery = [...requiredSets[0]!].filter((r) => requiredSets.every((set) => set.has(r)));
  flat.required = [...new Set([...((body.required as string[]) ?? []), ...inEvery])];
  if (variants.every((v) => v.additionalProperties === false)) flat.additionalProperties = false;
  else delete flat.additionalProperties;
  const shapes =
    "The body takes one of these shapes. " +
    variants
      .map((v, i) => {
        const own = ((v.required as string[]) ?? []).filter((r) => !inEvery.includes(r));
        // `anyOf: [{required: [a]}, {required: [b]}]` on a shape means "a or b".
        const either = Array.isArray(v.anyOf)
          ? (v.anyOf as Json[]).map((alt) => ((alt?.required as string[]) ?? []).join(" and ")).filter(Boolean)
          : [];
        if (either.length) own.push(either.join(" or "));
        return `${v.title ?? `Shape ${i + 1}`}: ${own.length ? `also requires ${own.join(", ")}` : "nothing more is required"}.`;
      })
      .join(" ");
  return { body: flat, shapes };
}

interface Generated {
  name: string;
  toolset: Toolset;
  method: string;
  path: string;
  description: string;
  inputSchema: Json;
  /** Argument names substituted into the path template. */
  pathParams: string[];
  /** Argument names sent as query string. */
  queryParams: string[];
  /** How the request body is assembled from the flat arguments. */
  bodyMode: "inline" | "wrapped" | "none";
  /** For bodyMode "inline": argument names that belong in the JSON body. */
  bodyProps: string[];
  /**
   * Path parameters that must ALSO appear in the body. The specs occasionally declare
   * the same identifier in both places — see PUT /v1/customers/{customer_id}, where the
   * spec marks the body value required (the gateway overwrites it with the path value).
   * We expose a single argument and write it to both.
   */
  alsoInBody: string[];
  closedBody: boolean;
  movesMoney: boolean;
  needsConfirm: boolean;
  needsIdempotency: boolean;
  sandboxOnly: boolean;
  spec: string;
}

const tools: Generated[] = [];
const problems: string[] = [];
const unmapped: string[] = [];
const blockedSeen: string[] = [];
const overridesUsed = new Set<string>();
let operationCount = 0;

for (const file of readdirSync(SPECS).filter((f) => f.endsWith(".yaml")).sort()) {
  const doc = parse(readFileSync(join(SPECS, file), "utf8")) as Json;
  const paths: Json = doc.paths ?? {};

  for (const [path, item] of Object.entries(paths)) {
    for (const method of METHODS) {
      const op = (item as Json)?.[method];
      if (!op) continue;
      operationCount++;

      const key = opKey(method, path);

      if (BLOCKED[key]) {
        blockedSeen.push(`${key} — ${BLOCKED[key]}`);
        continue;
      }

      const curated = NAMES[key];
      if (!curated) {
        unmapped.push(`${file}: ${key}`);
        continue;
      }
      // The specs' operationIds are the tool names (docs Phase 3 set them so). A curation
      // name that differs is two names for one route, in the docs and in the tools.
      if (typeof op.operationId === "string" && op.operationId !== curated.name) {
        problems.push(`${key}: curation names it "${curated.name}", but the spec operationId is "${op.operationId}"`);
      }

      // ---- description --------------------------------------------------------
      const summary = (op.summary ?? "").trim();
      const specDetail = squash(op.description ?? "");
      const override = DESCRIPTION_OVERRIDES[curated.name];
      const detail = override?.description !== undefined ? squash(override.description) : specDetail;
      const prereq = PREREQUISITES[curated.name];
      const parts = [summary, detail].filter(Boolean);
      let description = parts.join(" — ");
      if (prereq) description += `\n\n${prereq}`;
      if (!description) description = `${method.toUpperCase()} ${path}`;

      // ---- input schema -------------------------------------------------------
      const properties: Json = {};
      const required: string[] = [];
      const paramLocation: Record<string, "path" | "query"> = {};

      const params = [...((item as Json).parameters ?? []), ...(op.parameters ?? [])].map((p: any) =>
        deref(p, doc),
      );

      for (const p of params) {
        if (!p?.name || !p?.in) continue;
        // The client always sends Idempotency-Key; the model may supply one through the
        // idempotency_key argument.
        if (p.in === "header") continue;
        if (p.in !== "path" && p.in !== "query") continue;

        const schema = slim(deref(p.schema ?? { type: "string" }, doc));
        if (p.description) schema.description = String(p.description).replace(/\s+/g, " ").trim();
        properties[p.name] = schema;
        paramLocation[p.name] = p.in;
        // Path params are always required regardless of how the spec marks them.
        if (p.required || p.in === "path") required.push(p.name);
      }

      let bodyMode: "inline" | "wrapped" | "none" = "none";
      let closedBody = false;
      const bodyProps: string[] = [];
      const alsoInBody: string[] = [];
      const bodyContent = op.requestBody?.content;
      if (bodyContent && !bodyContent["application/json"]) {
        // The client sends JSON only. Without this a multipart or form body silently
        // became a tool with no body, which fails on every call.
        problems.push(`${key}: the request body is ${Object.keys(bodyContent).join(", ")}, not application/json`);
      }
      const bodySchemaRaw = bodyContent?.["application/json"]?.schema;
      if (bodySchemaRaw) {
        let body = slim(deref(bodySchemaRaw, doc));
        // One shape per kind of account or payee in the spec (the docs show a tab for
        // each) stays one flat argument set in the tool, with the shapes named.
        const flat = FLATTEN_BODY_VARIANTS.has(curated.name) ? flattenVariants(body) : undefined;
        if (flat) {
          body = flat.body;
          description += `\n\n${flat.shapes}`;
        }

        if (body?.type === "object" && body.properties && !body.oneOf && !body.anyOf) {
          // Plain object: inline its properties so the model fills one flat argument set.
          bodyMode = "inline";
          // A body the spec closes is closed in the tool too: the route rejects unknown
          // fields, so passing extra arguments through would fail the call.
          closedBody = body.additionalProperties === false;
          for (const [k, v] of Object.entries(body.properties)) {
            if (k in properties) {
              if (paramLocation[k] === "path") {
                // Same identifier declared in both places. Expose one argument and send
                // it to both, rather than asking the model for it twice.
                alsoInBody.push(k);
                const existing = properties[k] as Json;
                const incoming = v as Json;
                if (!existing.description && incoming?.description) existing.description = incoming.description;
                continue;
              }
              problems.push(`${key}: body property "${k}" collides with a ${paramLocation[k]} parameter`);
              continue;
            }
            properties[k] = v;
            bodyProps.push(k);
          }
          // A body-required field supplied through the path is already required; the
          // duplicate goes when `required` is de-duplicated below.
          if (Array.isArray(body.required)) required.push(...body.required);
        } else {
          // oneOf/anyOf (e.g. CreateCustomerRequest: individual vs business) or a
          // non-object body. Keep the construct intact under `body` rather than
          // flattening variants together, which would produce an invalid payload.
          bodyMode = "wrapped";
          properties.body = body;
          required.push("body");
          if (body?.oneOf || body?.anyOf) {
            const variants = (body.oneOf ?? body.anyOf) as Json[];
            const titles = variants.map((v, i) => v?.title ?? `variant ${i + 1}`).join(" | ");
            properties.body.description =
              `Request body. Choose exactly one shape: ${titles}. ` + (body.description ?? "");
          }
        }
      }

      // Replace false spec text, and fail once the spec no longer carries it.
      if (override) {
        overridesUsed.add(curated.name);
        const specText = squash([specDetail, ...descriptions(properties)].join(" "));
        if (!specText.includes(squash(override.whileSpecSays))) {
          problems.push(
            `${curated.name}: DESCRIPTION_OVERRIDES expects the spec to say "${override.whileSpecSays}", but it ` +
              `no longer does. The spec was likely fixed — delete the override in curation.ts.`,
          );
        }
        for (const [prop, text] of Object.entries(override.params ?? {})) {
          // A dotted name reaches a nested property: `source.methods`.
          const parts = prop.split(".");
          let holder: Json | undefined = properties;
          for (const part of parts.slice(0, -1)) holder = (holder?.[part] as Json | undefined)?.properties;
          const last = parts[parts.length - 1]!;
          if (!holder || !(last in holder)) {
            problems.push(`${curated.name}: DESCRIPTION_OVERRIDES names property "${prop}", which the tool does not have`);
            continue;
          }
          holder[last] = { ...(holder[last] as Json), description: squash(text) };
        }
      }

      // Strip any enum values this tool must not offer, before the schema is emitted.
      const restriction = ENUM_RESTRICTIONS[curated.name];
      if (restriction) {
        const touched = restrictEnums(properties, restriction.remove);
        if (touched === 0) {
          problems.push(
            `${curated.name}: ENUM_RESTRICTIONS removes [${restriction.remove.join(", ")}] but no enum ` +
              `in the generated schema contains any of them. The specification likely changed — ` +
              `re-check the restriction in curation.ts rather than leaving it silently inert.`,
          );
        }
        description += `\n\nNOT FOR CARD PAYMENTS. ${restriction.because}`;
      }

      // A file argument, read by the server, beside each base64 field (src/files.ts).
      const uploads = UPLOADS[curated.name];
      if (uploads) {
        const root = { type: "object", properties, required };
        problems.push(...addFilePaths(curated.name, root, uploads));
        required.splice(0, required.length, ...(root.required as string[]));
      }

      // Money-moving and irreversible tools carry an explicit confirmation argument.
      // Declared here so it appears in the schema the model sees; enforced in safety.ts.
      const movesMoney = isMoneyOp(method, path);
      const needsConfirm = needsConfirmation(method, path);
      if (needsConfirm) {
        properties.confirm = {
          type: "boolean",
          description:
            "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true.",
        };
      }

      // Every tool that sends an Idempotency-Key takes an optional idempotency_key, so a
      // call whose outcome is unknown can be resent under its first key. Declared here so
      // closed schemas accept it; the client sends it as the header, never in the body.
      const needsIdempotency = needsIdempotencyKey(method, path);
      if (needsIdempotency) {
        if ("idempotency_key" in properties) {
          problems.push(`${key}: the spec declares "idempotency_key", which collides with the client's argument`);
        } else {
          properties.idempotency_key = {
            type: "string",
            minLength: 1,
            maxLength: 255,
            pattern: "^[\\x20-\\x7E]+$",
            description:
              "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome " +
              "is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and " +
              "exactly the same arguments. If the first call took effect, the API returns its answer instead of " +
              "running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave " +
              "it out: that answer is kept for 24 hours under its key.",
          };
        }
      }

      tools.push({
        name: curated.name,
        toolset: curated.toolset,
        method,
        path,
        description,
        inputSchema: {
          type: "object",
          properties,
          required: [...new Set(required)],
          // Inline bodies stay open: several specs document a subset of accepted fields
          // and rejecting extras here would block valid calls. A body the spec closes
          // stays closed. Wrapped bodies carry the full schema already, so extras are a
          // mistake.
          additionalProperties: bodyMode === "inline" && !closedBody,
        },
        pathParams: Object.keys(paramLocation).filter((k) => paramLocation[k] === "path"),
        queryParams: Object.keys(paramLocation).filter((k) => paramLocation[k] === "query"),
        bodyMode,
        bodyProps,
        alsoInBody,
        closedBody,
        movesMoney,
        needsConfirm,
        needsIdempotency,
        sandboxOnly: isSandboxOnly(method, path),
        spec: file,
      });
    }
  }
}

// ---- integrity checks -------------------------------------------------------
const byName = new Map<string, string[]>();
for (const t of tools) byName.set(t.name, [...(byName.get(t.name) ?? []), `${t.method.toUpperCase()} ${t.path}`]);
for (const [name, where] of byName) {
  if (where.length > 1) problems.push(`duplicate tool name "${name}": ${where.join(", ")}`);
}

const curatedKeys = new Set(Object.keys(NAMES));
const generatedKeys = new Set(tools.map((t) => opKey(t.method, t.path)));
for (const k of curatedKeys) {
  if (!generatedKeys.has(k) && !BLOCKED[k]) {
    problems.push(`curation.ts names "${k}" but no such operation exists in the specs`);
  }
}

for (const [set, label] of [
  [MONEY_OPS, "MONEY_OPS"],
  [CONFIRM_OPS, "CONFIRM_OPS"],
  [SANDBOX_ONLY, "SANDBOX_ONLY"],
] as const) {
  for (const k of set) {
    if (!generatedKeys.has(k)) problems.push(`${label} gates "${k}", but no tool calls it`);
  }
}

// Every curation map keyed by tool name must name a tool. A key that names nothing is a
// hint, lookup or rule that no tool carries, so a rename or a removal would otherwise
// drop it silently.
for (const [map, label] of [
  [UPLOADS, "UPLOADS"],
  [DOWNLOADS, "DOWNLOADS"],
  [PREREQUISITES, "PREREQUISITES"],
  [ENUM_RESTRICTIONS, "ENUM_RESTRICTIONS"],
  [OUTCOME_LOOKUPS, "OUTCOME_LOOKUPS"],
  [UPPER_CASE_ARGS, "UPPER_CASE_ARGS"],
] as const) {
  for (const name of Object.keys(map)) {
    if (!byName.has(name)) problems.push(`${label} names "${name}", which is not a generated tool`);
  }
}

// A blocked name explains a tool that does not exist; it must not shadow one that does.
const manualNames = new Set(MANUAL_TOOLS.map((t) => t.name));
for (const name of Object.keys(BLOCKED_TOOL_NAMES)) {
  if (byName.has(name) || manualNames.has(name)) {
    problems.push(`BLOCKED_TOOL_NAMES lists "${name}", which is a tool: delete the entry`);
  }
}
for (const name of manualNames) {
  if (byName.has(name)) problems.push(`manual tool "${name}" has the same name as a generated tool`);
}

for (const name of Object.keys(DESCRIPTION_OVERRIDES)) {
  if (!overridesUsed.has(name)) problems.push(`DESCRIPTION_OVERRIDES names "${name}", which is not a generated tool`);
}

console.log(`specs:      ${readdirSync(SPECS).filter((f) => f.endsWith(".yaml")).length} files`);
console.log(`operations: ${operationCount}`);
console.log(`blocked:    ${blockedSeen.length}`);
console.log(`tools:      ${tools.length}`);

// An operation with neither a name nor a BLOCKED reason is a route the specs document and
// the server silently does not serve. That is a decision to make, not a warning to scroll.
for (const u of unmapped) problems.push(`${u}: no name in curation.ts NAMES and no BLOCKED reason`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

// ---- emit -------------------------------------------------------------------
mkdirSync(dirname(OUT), { recursive: true });
tools.sort((a, b) => a.name.localeCompare(b.name));

const banner = `// GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from specs/*.yaml.
// To change a tool's name, toolset, blocklist status, or ordering guidance,
// edit src/curation.ts and re-run: npm run generate
`;

writeFileSync(
  OUT,
  `${banner}
import type { Toolset } from "../curation.ts";

export interface GeneratedTool {
  /** MCP tool name, unique across all specs. */
  name: string;
  /** Which --toolsets group this belongs to. */
  toolset: Toolset;
  /** HTTP method to call on the Gravv API. */
  method: string;
  /** Path template, e.g. /v1/accounts/{account_id}. */
  path: string;
  /** Tool description shown to the model, including any ordering prerequisites. */
  description: string;
  /** JSON Schema for the tool's flat argument object. */
  inputSchema: Record<string, unknown>;
  /** Argument names substituted into the path template. */
  pathParams: string[];
  /** Argument names sent as query string. */
  queryParams: string[];
  /** How to assemble the request body from the flat arguments. */
  bodyMode: "inline" | "wrapped" | "none";
  /** For bodyMode "inline": argument names belonging in the JSON body. */
  bodyProps: string[];
  /** Path parameters that must also be written into the body. */
  alsoInBody: string[];
  /** The route rejects unknown body fields: undeclared arguments are not passed through. */
  closedBody: boolean;
  /** Moves money: GRAVV_ALLOW_LIVE_WRITES is needed on a live key, as well as confirm. */
  movesMoney: boolean;
  /** Requires confirm: true (every money-moving tool, and the irreversible ones). */
  needsConfirm: boolean;
  /** Client must attach a generated Idempotency-Key. */
  needsIdempotency: boolean;
  /** Works only with a sandbox key: hidden and refused on any other. */
  sandboxOnly: boolean;
  /** Source spec filename, for traceability. */
  spec: string;
}

export const TOOLS: GeneratedTool[] = ${JSON.stringify(tools, null, 2)};

export const TOOLS_BY_NAME: ReadonlyMap<string, GeneratedTool> = new Map(
  TOOLS.map((t) => [t.name, t]),
);
`,
);

console.log(`\nwrote ${OUT.replace(root + "/", "")}`);
