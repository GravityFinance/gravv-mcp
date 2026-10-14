import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkSchema, invalidPatterns, unsupportedKeywords } from "../scripts/schema-check.ts";
import { TOOLS } from "../src/generated/tools.ts";
import { MANUAL_TOOLS } from "../src/manual-tools.ts";

const payee = {
  type: "object",
  required: ["customer_id", "currency"],
  properties: {
    customer_id: { type: "string", format: "uuid" },
    currency: { type: "string", enum: ["USD", "NGN"] },
    account_number: { type: "string", nullable: true, minLength: 4, maxLength: 12, pattern: "^[0-9]+$" },
    amount: { type: "number", minimum: 1, maximum: 100 },
    count: { type: "integer" },
    address: { type: "object", properties: { city: { type: "string" } } },
    metadata: { type: "object" },
    tags: { type: "array", items: { type: "string" } },
  },
  additionalProperties: true,
};

const ok = { customer_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7", currency: "USD" };

describe("checkSchema", () => {
  test("a value that fits gives no problems", () => {
    assert.deepEqual(checkSchema(payee, { ...ok, account_number: "0123", amount: 5, count: 2, tags: ["a"] }), []);
  });

  test("required, type, enum, length, pattern and range", () => {
    assert.deepEqual(checkSchema(payee, { currency: "EUR" }), [
      "customer_id: is required",
      'currency: "EUR" is not one of USD, NGN',
    ]);
    assert.deepEqual(checkSchema(payee, { ...ok, amount: "5" }), ["amount: expected number, got string"]);
    assert.deepEqual(checkSchema(payee, { ...ok, count: 1.5 }), ["count: expected integer, got number"]);
    assert.deepEqual(checkSchema(payee, { ...ok, account_number: "12a" }), [
      "account_number: shorter than 4",
      "account_number: does not match ^[0-9]+$",
    ]);
    assert.deepEqual(checkSchema(payee, { ...ok, amount: 500 }), ["amount: above 100"]);
  });

  test("nullable and format", () => {
    assert.deepEqual(checkSchema(payee, { ...ok, account_number: null }), []);
    assert.deepEqual(checkSchema(payee, { ...ok, customer_id: "abc" }), ["customer_id: not a valid uuid"]);
    assert.deepEqual(checkSchema({ type: "string", format: "date" }, "2026-13-40"), ["(arguments): not a valid date"]);
    assert.deepEqual(checkSchema({ type: "string", format: "date-time" }, "2026-10-13T09:15:22.481Z"), []);
    assert.deepEqual(checkSchema({ type: "string", format: "uri" }, "https://example.com/done"), []);
    assert.deepEqual(checkSchema({ type: "string", format: "uri" }, "example.com"), ["(arguments): not a valid uri"]);
  });

  test("type lists, exclusive bounds and item counts", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: ["string", "null"], maxLength: 3 },
        amount: { type: "number", exclusiveMinimum: 0, exclusiveMaximum: 10 },
        methods: { type: "array", minItems: 1, maxItems: 2, items: { type: "string" } },
      },
    };
    assert.deepEqual(checkSchema(schema, { name: null, amount: 0.01, methods: ["a"] }), []);
    assert.deepEqual(checkSchema(schema, { name: 1 }), ["name: expected string or null, got integer"]);
    assert.deepEqual(checkSchema(schema, { amount: 0 }), ["amount: not above 0"]);
    assert.deepEqual(checkSchema(schema, { amount: 10 }), ["amount: not below 10"]);
    assert.deepEqual(checkSchema(schema, { methods: [] }), ["methods: fewer than 1 items"]);
    assert.deepEqual(checkSchema(schema, { methods: ["a", "b", "c"] }), ["methods: more than 2 items"]);
  });

  test("an undeclared property is reported only in strict mode, and only where properties are declared", () => {
    const body = { ...ok, rail: "ach", address: { city: "Lagos", zip: "1" }, metadata: { any: 1 } };
    assert.deepEqual(checkSchema(payee, body), []);
    assert.deepEqual(checkSchema(payee, body, { strict: true }), ["rail: is not declared", "address.zip: is not declared"]);
    assert.deepEqual(checkSchema({ ...payee, additionalProperties: false }, { ...ok, rail: "ach" }), [
      "rail: is not allowed",
    ]);
  });

  test("oneOf needs exactly one shape to fit", () => {
    const source = {
      oneOf: [
        { title: "Account", type: "object", required: ["type", "id"], properties: { type: { type: "string", enum: ["account"] }, id: { type: "string" } } },
        { title: "Wallet", type: "object", required: ["type", "address"], properties: { type: { type: "string", enum: ["wallet"] }, address: { type: "string" } } },
      ],
    };
    assert.deepEqual(checkSchema(source, { type: "wallet", address: "0x1" }, { strict: true }), []);
    const [problem] = checkSchema(source, { type: "card", id: "1" }, { strict: true });
    assert.match(problem!, /fits none of the 2 allowed shapes \(Account: type: "card" is not one of account; Wallet:/);
    assert.deepEqual(checkSchema({ oneOf: [{ type: "string" }, { type: "string" }] }, "x"), [
      "(arguments): fits more than one of the allowed shapes",
    ]);
  });

  test("anyOf takes a value that fits one or more of its shapes", () => {
    // createAccount currency: a listed code, or any label for a wallet-only account.
    const currency = {
      anyOf: [{ type: "string", enum: ["USD", "NGN"] }, { type: "string", minLength: 1 }],
    };
    assert.deepEqual(checkSchema(currency, "USD"), []);
    assert.deepEqual(checkSchema(currency, "USDC"), []);
    assert.deepEqual(checkSchema(currency, ""), [
      '(arguments): fits none of the 2 accepted shapes (shape 1: (arguments): "" is not one of USD, NGN; ' +
        "shape 2: (arguments): shorter than 1)",
    ]);
    assert.deepEqual(unsupportedKeywords({ anyOf: [{ type: "string", const: "x" }] }), ["(arguments)|0: const"]);
    assert.deepEqual(invalidPatterns({ anyOf: [{ type: "string", pattern: "(?i)x" }] }), ["(arguments)|0: (?i)x"]);
  });

  test("a placeholder value is not checked, but still counts as sent", () => {
    const isPlaceholder = (v: unknown) => v === "<id>";
    assert.deepEqual(checkSchema(payee, { ...ok, customer_id: "<id>" }, { isPlaceholder }), []);
    assert.deepEqual(checkSchema(payee, { ...ok, rail: "<id>" }, { strict: true, isPlaceholder }), [
      "rail: is not declared",
    ]);
  });

  test("an unknown keyword is a problem, not a pass", () => {
    assert.deepEqual(checkSchema({ allOf: [{ type: "string" }] }, 1), ["(arguments): unsupported schema keyword allOf"]);
    assert.deepEqual(checkSchema({ type: "string", format: "hostname" }, "x"), ["(arguments): unsupported format hostname"]);
  });

  test("a pattern that is not an ECMAScript regular expression is a problem, not a crash", () => {
    const schema = { type: "object", properties: { filename: { type: "string", pattern: "(?i)\\.pdf$" } } };
    assert.deepEqual(checkSchema(schema, { filename: "a.pdf" }), [
      "filename: pattern (?i)\\.pdf$ is not an ECMAScript regular expression",
    ]);
    assert.deepEqual(invalidPatterns(schema), ["filename: (?i)\\.pdf$"]);
    assert.deepEqual(invalidPatterns({ type: "string", pattern: "^[A-Z]{3}$" }), []);
  });
});

describe("tool schemas", () => {
  test("every tool schema uses only keywords the check understands", () => {
    for (const tool of [...TOOLS, ...MANUAL_TOOLS]) {
      assert.deepEqual(unsupportedKeywords(tool.inputSchema), [], `${tool.name} uses a keyword the check cannot read`);
    }
  });

  test("no enum sits on an object type", () => {
    // The generator once merged allOf into `type: object` whatever the branches said, so a
    // string enum reached through allOf (a $ref with a sibling description) asked for an
    // object. A value the API reads as a string would then fail any validating client.
    const walk = (node: unknown, at: string): string[] => {
      if (node === null || typeof node !== "object") return [];
      if (Array.isArray(node)) return node.flatMap((n, i) => walk(n, `${at}[${i}]`));
      const n = node as Record<string, unknown>;
      const own = n.type === "object" && Array.isArray(n.enum) ? [at] : [];
      return [...own, ...Object.entries(n).flatMap(([k, v]) => walk(v, `${at}.${k}`))];
    };
    const found = [...TOOLS, ...MANUAL_TOOLS].flatMap((tool) => walk(tool.inputSchema, tool.name));
    assert.deepEqual(found, []);
  });

  test("every pattern is an ECMAScript regular expression", () => {
    // JSON Schema patterns are ECMAScript regular expressions; a validating client cannot
    // compile one written for another dialect, such as an inline (?i) flag. The KYC upload
    // spec carried one until docs Phase 3 dropped the pattern (the content decides the type).
    const found = [...TOOLS, ...MANUAL_TOOLS].flatMap((tool) =>
      invalidPatterns(tool.inputSchema).map((p) => `${tool.name} ${p}`),
    );
    assert.deepEqual(found, []);
  });
});
