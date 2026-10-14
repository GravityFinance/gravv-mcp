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
import {
  NAMES,
  BLOCKED,
  PREREQUISITES,
  ENUM_RESTRICTIONS,
  DESCRIPTION_OVERRIDES,
  opKey,
  isMoneyOp,
  needsIdempotencyKey,
  type Toolset,
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
  // flat object rather than a construct most MCP clients ignore.
  if (Array.isArray(out.allOf)) {
    const merged: Json = { type: "object", properties: {}, required: [] as string[] };
    for (const branch of out.allOf) {
      if (branch?.type && !merged.type) merged.type = branch.type;
      Object.assign(merged.properties, branch?.properties ?? {});
      if (Array.isArray(branch?.required)) merged.required.push(...branch.required);
      for (const [k, v] of Object.entries(branch ?? {})) {
        if (!["properties", "required", "type", "allOf"].includes(k) && !(k in merged)) merged[k] = v;
      }
    }
    delete out.allOf;
    const { properties = {}, required = [], ...rest } = out;
    return {
      ...merged,
      ...rest,
      properties: { ...merged.properties, ...properties },
      required: [...new Set([...merged.required, ...required])],
    };
  }

  return out;
}

/** Strip keywords that add tokens without helping the model produce valid input. */
function slim(schema: any, depth = 0): any {
  if (schema === null || typeof schema !== "object" || depth > 25) return schema;
  if (Array.isArray(schema)) return schema.map((s) => slim(s, depth + 1));

  const DROP = new Set(["xml", "externalDocs", "discriminator", "readOnly", "writeOnly", "deprecated", "$schema"]);
  const out: Json = {};
  for (const [k, v] of Object.entries(schema)) {
    if (DROP.has(k)) continue;
    if (k === "example" && "examples" in schema) continue;
    out[k] = slim(v, depth + 1);
  }
  return out;
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
  movesMoney: boolean;
  needsIdempotency: boolean;
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
        // Idempotency-Key is generated by the client, never asked of the model.
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
      const bodyProps: string[] = [];
      const alsoInBody: string[] = [];
      const bodySchemaRaw = op.requestBody?.content?.["application/json"]?.schema;
      if (bodySchemaRaw) {
        const body = slim(deref(bodySchemaRaw, doc));

        if (body?.type === "object" && body.properties && !body.oneOf && !body.anyOf) {
          // Plain object: inline its properties so the model fills one flat argument set.
          bodyMode = "inline";
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
          if (Array.isArray(body.required)) {
            // A body-required field that is supplied via the path is already required.
            required.push(...body.required.filter((r: string) => !alsoInBody.includes(r) || true));
          }
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
          if (!(prop in properties)) {
            problems.push(`${curated.name}: DESCRIPTION_OVERRIDES names property "${prop}", which the tool does not have`);
            continue;
          }
          properties[prop] = { ...(properties[prop] as Json), description: squash(text) };
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

      // Money-moving tools carry an explicit confirmation argument. Declared here so it
      // appears in the schema the model sees; enforced in safety.ts.
      const movesMoney = isMoneyOp(method, path);
      if (movesMoney) {
        properties.confirm = {
          type: "boolean",
          description:
            "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true.",
        };
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
          // and rejecting extras here would block valid calls. Wrapped bodies carry the
          // full schema already, so extras are a mistake.
          additionalProperties: bodyMode === "inline",
        },
        pathParams: Object.keys(paramLocation).filter((k) => paramLocation[k] === "path"),
        queryParams: Object.keys(paramLocation).filter((k) => paramLocation[k] === "query"),
        bodyMode,
        bodyProps,
        alsoInBody,
        movesMoney,
        needsIdempotency: needsIdempotencyKey(method, path),
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

for (const name of Object.keys(DESCRIPTION_OVERRIDES)) {
  if (!overridesUsed.has(name)) problems.push(`DESCRIPTION_OVERRIDES names "${name}", which is not a generated tool`);
}

console.log(`specs:      ${readdirSync(SPECS).filter((f) => f.endsWith(".yaml")).length} files`);
console.log(`operations: ${operationCount}`);
console.log(`blocked:    ${blockedSeen.length}`);
console.log(`tools:      ${tools.length}`);

if (unmapped.length) {
  console.error(`\n${unmapped.length} operation(s) have no name in curation.ts and were skipped:`);
  for (const u of unmapped) console.error(`  ${u}`);
}

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
  /** Requires confirm: true, and GRAVV_ALLOW_LIVE_WRITES on a live key. */
  movesMoney: boolean;
  /** Client must attach a generated Idempotency-Key. */
  needsIdempotency: boolean;
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
