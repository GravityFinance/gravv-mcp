import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileArgumentError, resolveUploads, saveDownload, sniff } from "../src/files.ts";
import { UPLOADS } from "../src/curation.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(100, 0x20)]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

let dir = "";
const file = (name: string, bytes: Buffer) => {
  const path = join(dir, name);
  writeFileSync(path, bytes);
  return path;
};

before(() => {
  dir = mkdtempSync(join(tmpdir(), "gravv-mcp-files-"));
});
after(() => rmSync(dir, { recursive: true, force: true }));

describe("file type from the first bytes", () => {
  test("PDF, PNG and JPEG are recognised, and nothing else", () => {
    assert.equal(sniff(PDF), "pdf");
    assert.equal(sniff(PNG), "png");
    assert.equal(sniff(JPEG), "jpeg");
    assert.equal(sniff(Buffer.from("GIF89a")), undefined);
    assert.equal(sniff(Buffer.alloc(0)), undefined);
  });
});

describe("uploads from file_path", () => {
  test("a transfer document is read, encoded, and its name and type filled", () => {
    const path = file("invoice.pdf", PDF);
    const args = { customer_id: "cus_1", document_type: "invoice", file_path: path };
    const out = resolveUploads("uploadTransferDocument", args);
    assert.equal(out.content, PDF.toString("base64"));
    assert.equal(out.file_name, "invoice.pdf");
    assert.equal(out.content_type, "application/pdf");
    assert.equal("file_path" in out, false, "file_path is an MCP argument, never sent");
    assert.equal((args as Record<string, unknown>).content, undefined, "the caller's arguments are not changed");
  });

  test("a name and type the caller sends are kept, but the type must match the file", () => {
    const path = file("scan.bin", PNG);
    const out = resolveUploads("uploadTransferDocument", { file_path: path, file_name: "receipt.png" });
    assert.equal(out.file_name, "receipt.png");
    assert.equal(out.content_type, "image/png");
    assert.throws(
      () => resolveUploads("uploadTransferDocument", { file_path: path, content_type: "application/pdf" }),
      (e: Error) => e instanceof FileArgumentError && /content_type is application\/pdf, but the file is image\/png/.test(e.message),
    );
  });

  test("a file over the limit, of the wrong type, missing, a folder or empty is refused", () => {
    const big = file("big.pdf", Buffer.concat([PDF, Buffer.alloc(700 * 1024)]));
    assert.throws(() => resolveUploads("uploadTransferDocument", { file_path: big }), /at most 700 KB/);
    const gif = file("pic.png", Buffer.from("GIF89a....."));
    assert.throws(() => resolveUploads("uploadTransferDocument", { file_path: gif }), /is not JPEG, PNG, PDF/);
    assert.throws(() => resolveUploads("uploadTransferDocument", { file_path: join(dir, "nope.pdf") }), /cannot be read/);
    const folder = join(dir, "folder");
    mkdirSync(folder);
    assert.throws(() => resolveUploads("uploadTransferDocument", { file_path: folder }), /not a regular file/);
    const empty = file("empty.pdf", Buffer.alloc(0));
    assert.throws(() => resolveUploads("uploadTransferDocument", { file_path: empty }), /is empty/);
  });

  test("file_path and content together are refused", () => {
    const path = file("a.jpg", JPEG);
    assert.throws(
      () => resolveUploads("uploadCustomerKycDocument", { file_path: path, content: "abc" }),
      /send file_path or content, not both/,
    );
  });

  test("each document in a v2 account request is read, nested ones too", () => {
    const a = file("id.jpg", JPEG);
    const b = file("proof.pdf", PDF);
    const out = resolveUploads("createAccountV2", {
      customer_id: "cus_1",
      data: {
        documents: [{ document_type: "proof_of_address", file_path: b }, { id: "doc_on_file" }],
        parties: [{ id: "p_1", documents: [{ document_type: "passport", file_path: a }] }],
      },
    }) as any;
    assert.equal(out.data.documents[0].content, PDF.toString("base64"));
    assert.equal(out.data.documents[0].filename, "proof.pdf");
    assert.deepEqual(out.data.documents[1], { id: "doc_on_file" });
    assert.equal(out.data.parties[0].documents[0].content, JPEG.toString("base64"));
    assert.throws(
      () => resolveUploads("updateAccountApplicationV2", { documents: [{ file_path: join(dir, "x.pdf") }] }),
      /documents\[0\]: file_path .* cannot be read/,
    );
  });

  test("a tool without uploads passes its arguments through untouched", () => {
    const args = { file_path: "/etc/hosts" };
    assert.equal(resolveUploads("listAccounts", args), args);
  });

  test("every upload slot offers file_path, and its content is optional", () => {
    for (const [name, specs] of Object.entries(UPLOADS)) {
      const tool = TOOLS_BY_NAME.get(name);
      assert.ok(tool, name);
      for (const spec of specs) {
        let node: any = tool.inputSchema;
        for (const part of spec.at ? spec.at.split(".") : []) {
          node = node.properties[part.replace("[]", "")];
          if (part.endsWith("[]")) node = node.items;
        }
        assert.ok(node.properties.file_path, `${name} ${spec.at}`);
        assert.equal((node.required ?? []).includes(spec.content), false, `${name} ${spec.at}`);
      }
    }
  });
});

describe("downloads are saved, not returned", () => {
  test("the file is written 0600 under a 0700 folder, and only its path comes back", () => {
    const out = join(dir, "downloads");
    const png = PNG.toString("base64");
    const data = {
      content: `data:image/png;base64,${png}`,
      content_type: "image/png",
      filename: "3f9a.png",
      side: "front",
      document_id: "550e8400-e29b-41d4-a716-446655440000",
      size_bytes: PNG.length,
    };
    const result = saveDownload(
      "downloadCustomerKycDocument",
      { customer_id: "cus_1", document_id: "550e8400-e29b-41d4-a716-446655440000", side: "front" },
      data,
      out,
    ) as Record<string, unknown>;
    assert.equal(result.content, undefined, "the base64 never reaches the model");
    assert.equal(result.saved_to, join(out, "kyc-550e8400-e29b-41d4-a716-446655440000-front.png"));
    assert.equal(result.saved_bytes, PNG.length);
    assert.deepEqual(readFileSync(result.saved_to as string), PNG);
    assert.equal(statSync(result.saved_to as string).mode & 0o777, 0o600);
    assert.equal(statSync(out).mode & 0o777, 0o700);
  });

  test("an argument cannot steer the file out of the folder", () => {
    const out = join(dir, "downloads2");
    const result = saveDownload(
      "downloadCustomerKycDocument",
      { document_id: "../../etc/passwd", side: "front/../x" },
      { content: `data:application/pdf;base64,${PDF.toString("base64")}` },
      out,
    ) as Record<string, unknown>;
    assert.equal(result.saved_to, join(out, "kyc-etcpasswd-frontx.pdf"));
  });

  test("other tools and answers without a file pass through", () => {
    const data = { items: [] };
    assert.equal(saveDownload("listAccounts", {}, data, dir), data);
    assert.equal(saveDownload("downloadCustomerKycDocument", {}, null, dir), null);
  });
});
