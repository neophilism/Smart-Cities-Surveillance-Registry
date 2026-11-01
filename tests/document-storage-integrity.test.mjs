import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileSystemDocumentStorage } from "../packages/documents/src/storage.ts";
test("content-addressed storage rejects mismatched bytes and detects corrupt retries", async () => {
  const root = await mkdtemp(join(tmpdir(), "storage-integrity-"));
  try {
    const storage = new FileSystemDocumentStorage(root);
    const data = new TextEncoder().encode("synthetic evidence");
    const sha256 = createHash("sha256").update(data).digest("hex");
    await assert.rejects(storage.put({ sha256: "a".repeat(64), data, extension: "pdf" }), /do not match/);
    const first = await storage.put({ sha256, data, extension: "pdf" });
    const simultaneous = await Promise.all(Array.from({ length: 10 }, () =>
      storage.put({ sha256, data, extension: "pdf" })));
    simultaneous.forEach((entry) => assert.deepEqual(entry, first));
    assert.deepEqual(await storage.put({ sha256, data, extension: "pdf" }), first);
    const path = join(root, first.storageKey);
    await writeFile(path, "corrupted");
    await assert.rejects(storage.put({ sha256, data, extension: "pdf" }), /integrity verification/);
    assert.equal(await readFile(path, "utf8"), "corrupted", "do not silently overwrite corrupt evidence");
    await assert.rejects(storage.put({ sha256, data, extension: "../../escape" }), /extension/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
