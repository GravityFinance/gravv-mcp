/**
 * A small JSON Schema check for tool arguments.
 *
 * The scenario and drift checks need to ask "would this request fit the tool schema the
 * model sees?". The tool schemas use a small set of keywords (listed in KEYWORDS), so this
 * covers exactly those. Any other keyword is reported as a problem rather than ignored: a
 * spec sync that brings in `allOf` or `anyOf` must fail the check loudly, not pass it
 * because the check could not read the schema.
 *
 * `strict` also reports a property the schema does not declare, even when
 * `additionalProperties` allows it. A model only sees declared properties, and on a GET the
 * client drops undeclared arguments, so an undeclared field in a guide's request is a field
 * the tool would never send.
 */

type Json = Record<string, unknown>;

/** Keywords the check understands. */
export const KEYWORDS = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minItems",
  "maxItems",
  "nullable",
  "oneOf",
  "format",
]);

/** Keywords that say nothing about validity. */
export const ANNOTATIONS = new Set(["description", "example", "default", "title"]);

export interface CheckOptions {
  /** Report properties the schema does not declare. */
  strict?: boolean;
  /** A value the guides write as a stand-in (`"<id>"`, `"…"`): its own value is not checked. */
  isPlaceholder?: (value: unknown) => boolean;
}

const FORMATS: Record<string, (v: unknown) => boolean> = {
  uuid: (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  date: (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
  "date-time": (v) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(v) &&
    !Number.isNaN(Date.parse(v)),
  email: (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  ipv4: (v) =>
    typeof v === "string" && /^(\d{1,3})(\.\d{1,3}){3}$/.test(v) && v.split(".").every((p) => Number(p) <= 255),
  int32: (v) => typeof v === "number" && Number.isInteger(v) && v >= -(2 ** 31) && v < 2 ** 31,
  byte: (v) => typeof v === "string" && v.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(v),
};

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function matchesType(type: string, v: unknown): boolean {
  const actual = typeOf(v);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
}

function child(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

function label(path: string): string {
  return path || "(arguments)";
}

/** Every keyword in a schema, nested ones included, that the check does not understand. */
export function unsupportedKeywords(schema: unknown, path = ""): string[] {
  if (!isObject(schema)) return [];
  const found: string[] = [];
  for (const [k, v] of Object.entries(schema)) {
    if (!KEYWORDS.has(k) && !ANNOTATIONS.has(k)) found.push(`${label(path)}: ${k}`);
    if (k === "properties" && isObject(v)) {
      for (const [name, sub] of Object.entries(v)) found.push(...unsupportedKeywords(sub, child(path, name)));
    } else if (k === "items" || (k === "additionalProperties" && isObject(v))) {
      found.push(...unsupportedKeywords(v, `${label(path)}[]`));
    } else if (k === "oneOf" && Array.isArray(v)) {
      v.forEach((branch, i) => found.push(...unsupportedKeywords(branch, `${label(path)}|${i}`)));
    }
  }
  return found;
}

/**
 * A schema pattern as a regular expression, or undefined when it is not one. JSON Schema
 * patterns are ECMAScript regular expressions; a pattern written for another dialect, such
 * as an inline `(?i)` flag, makes a validating client refuse the whole schema.
 */
function compilePattern(pattern: string): RegExp | undefined {
  try {
    return new RegExp(pattern, "u");
  } catch {
    return undefined;
  }
}

/** Every `pattern` in a schema, nested ones included, that is not an ECMAScript regular expression. */
export function invalidPatterns(schema: unknown, path = ""): string[] {
  if (!isObject(schema)) return [];
  const found: string[] = [];
  if (typeof schema.pattern === "string" && !compilePattern(schema.pattern)) {
    found.push(`${label(path)}: ${schema.pattern}`);
  }
  if (isObject(schema.properties)) {
    for (const [name, sub] of Object.entries(schema.properties)) found.push(...invalidPatterns(sub, child(path, name)));
  }
  if (schema.items !== undefined) found.push(...invalidPatterns(schema.items, `${label(path)}[]`));
  if (isObject(schema.additionalProperties)) found.push(...invalidPatterns(schema.additionalProperties, `${label(path)}[]`));
  if (Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach((branch, i) => found.push(...invalidPatterns(branch, `${label(path)}|${i}`)));
  }
  return found;
}

/** Problems with `value` against `schema`, as "path: message" lines. Empty means it fits. */
export function checkSchema(schema: unknown, value: unknown, options: CheckOptions = {}, path = ""): string[] {
  if (!isObject(schema)) return [`${label(path)}: the schema is not an object`];
  const unknown = Object.keys(schema).filter((k) => !KEYWORDS.has(k) && !ANNOTATIONS.has(k));
  if (unknown.length > 0) return [`${label(path)}: unsupported schema keyword ${unknown.join(", ")}`];

  if (options.isPlaceholder?.(value)) return [];

  // OpenAPI 3.1 writes a nullable field as a type list, `type: [string, "null"]`.
  const types = typeof schema.type === "string" ? [schema.type] : Array.isArray(schema.type) ? schema.type : undefined;

  if (value === null) {
    if (schema.nullable === true || types?.includes("null")) return [];
    if (schema.type === undefined && schema.oneOf === undefined && schema.enum === undefined) return [];
    return [`${label(path)}: is null`];
  }

  if (Array.isArray(schema.oneOf)) {
    const results = schema.oneOf.map((branch) => checkSchema(branch, value, options, path));
    const fits = results.filter((r) => r.length === 0).length;
    if (fits === 0) {
      const why = results
        .map((r, i) => {
          const branch = schema.oneOf as Json[];
          const name = typeof branch[i]?.title === "string" ? branch[i]!.title : `shape ${i + 1}`;
          return `${name}: ${r[0]}`;
        })
        .join("; ");
      return [`${label(path)}: fits none of the ${results.length} allowed shapes (${why})`];
    }
    if (fits > 1) return [`${label(path)}: fits more than one of the allowed shapes`];
  }

  const problems: string[] = [];
  if (types && !types.some((t) => typeof t === "string" && matchesType(t, value))) {
    return [`${label(path)}: expected ${types.join(" or ")}, got ${typeOf(value)}`];
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === value)) {
    problems.push(`${label(path)}: ${JSON.stringify(value)} is not one of ${schema.enum.join(", ")}`);
  }

  if (typeof value === "string") {
    const length = [...value].length;
    if (typeof schema.minLength === "number" && length < schema.minLength) {
      problems.push(`${label(path)}: shorter than ${schema.minLength}`);
    }
    if (typeof schema.maxLength === "number" && length > schema.maxLength) {
      problems.push(`${label(path)}: longer than ${schema.maxLength}`);
    }
    if (typeof schema.pattern === "string") {
      const re = compilePattern(schema.pattern);
      if (!re) problems.push(`${label(path)}: pattern ${schema.pattern} is not an ECMAScript regular expression`);
      else if (!re.test(value)) problems.push(`${label(path)}: does not match ${schema.pattern}`);
    }
  }

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      problems.push(`${label(path)}: below ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      problems.push(`${label(path)}: above ${schema.maximum}`);
    }
    // OpenAPI 3.1 (JSON Schema 2020-12) gives the exclusive bounds as numbers.
    if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) {
      problems.push(`${label(path)}: not above ${schema.exclusiveMinimum}`);
    }
    if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) {
      problems.push(`${label(path)}: not below ${schema.exclusiveMaximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      problems.push(`${label(path)}: fewer than ${schema.minItems} items`);
    }
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      problems.push(`${label(path)}: more than ${schema.maxItems} items`);
    }
  }

  if (typeof schema.format === "string") {
    const check = FORMATS[schema.format];
    if (!check) problems.push(`${label(path)}: unsupported format ${schema.format}`);
    else if ((typeof value === "string" || typeof value === "number") && !check(value)) {
      problems.push(`${label(path)}: not a valid ${schema.format}`);
    }
  }

  if (isObject(value)) problems.push(...checkObject(schema, value, options, path));

  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, i) => problems.push(...checkSchema(schema.items, item, options, `${label(path)}[${i}]`)));
  }

  return problems;
}

function checkObject(schema: Json, value: Json, options: CheckOptions, path: string): string[] {
  const problems: string[] = [];
  const properties = isObject(schema.properties) ? schema.properties : undefined;
  const required = Array.isArray(schema.required) ? schema.required : [];

  for (const name of required) {
    if (typeof name === "string" && value[name] === undefined) problems.push(`${child(path, name)}: is required`);
  }

  for (const [name, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const declared = properties?.[name];
    if (declared !== undefined) {
      problems.push(...checkSchema(declared, v, options, child(path, name)));
    } else if (schema.additionalProperties === false) {
      problems.push(`${child(path, name)}: is not allowed`);
    } else if (isObject(schema.additionalProperties)) {
      problems.push(...checkSchema(schema.additionalProperties, v, options, child(path, name)));
    } else if (options.strict && properties !== undefined) {
      problems.push(`${child(path, name)}: is not declared`);
    }
  }
  return problems;
}
