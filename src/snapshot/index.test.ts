import { strict as assert } from "assert";
import { test } from "node:test";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { SnapshotStorage, stripBase64Blocks, hashContent } from "./index";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bizcalc-test-"));
}

test("stripBase64Blocks - removes large base64 data URIs", () => {
  const bigBase64 = "A".repeat(2000);
  const html = `<img src="data:image/png;base64,${bigBase64}">`;
  const result = stripBase64Blocks(html);
  assert.ok(!result.includes(bigBase64));
  assert.ok(result.includes("[base64-stripped]"));
});

test("stripBase64Blocks - keeps small base64", () => {
  const smallBase64 = "A".repeat(100);
  const html = `<img src="data:image/png;base64,${smallBase64}">`;
  const result = stripBase64Blocks(html);
  assert.ok(result.includes(smallBase64));
});

test("hashContent - produces consistent hashes", () => {
  const h1 = hashContent("hello world");
  const h2 = hashContent("hello world");
  assert.equal(h1, h2);
  assert.notEqual(h1, hashContent("different content"));
});

test("SnapshotStorage - store and retrieve", () => {
  const dir = makeTempDir();
  const storage = new SnapshotStorage({ storageDir: dir, storeOnFailure: true, samplingRate: 1 });

  const url = "https://example.com/listing/123/";
  const html = "<html><body>Test listing</body></html>";

  const key = storage.store(url, html, "sampled");
  assert.ok(key);

  const retrieved = storage.retrieve(url);
  assert.equal(retrieved, html);
});

test("SnapshotStorage - deduplication by hash", () => {
  const dir = makeTempDir();
  const storage = new SnapshotStorage({ storageDir: dir, storeOnFailure: true, samplingRate: 1 });

  const url = "https://example.com/listing/123/";
  const html = "<html><body>Same content</body></html>";

  storage.store(url, html, "sampled");
  storage.store(url, html, "sampled"); // Same content, should not create duplicate file

  const list = storage.list();
  assert.equal(list.length, 1);
});

test("SnapshotStorage - size cap enforcement", () => {
  const dir = makeTempDir();
  const storage = new SnapshotStorage({
    storageDir: dir,
    maxSizeBytes: 50, // very small cap
    storeOnFailure: true,
    samplingRate: 1,
  });

  const url = "https://example.com/listing/456/";
  const bigHtml = "<html>" + "X".repeat(100) + "</html>";

  const key = storage.store(url, bigHtml, "sampled");
  assert.equal(key, undefined); // Should be rejected
});

test("SnapshotStorage - TTL expiry", async () => {
  const dir = makeTempDir();
  const storage = new SnapshotStorage({
    storageDir: dir,
    ttlMs: 1, // 1ms TTL
    storeOnFailure: true,
    samplingRate: 1,
  });

  const url = "https://example.com/listing/789/";
  const html = "<html>Old listing</html>";
  storage.store(url, html, "sampled");

  // Wait for TTL to expire
  await new Promise((r) => setTimeout(r, 10));

  const retrieved = storage.retrieve(url);
  assert.equal(retrieved, undefined); // Should be expired
});

test("SnapshotStorage - list snapshots", () => {
  const dir = makeTempDir();
  const storage = new SnapshotStorage({ storageDir: dir, storeOnFailure: true, samplingRate: 1 });

  storage.store("https://example.com/a/", "<html>A</html>", "sampled");
  storage.store("https://example.com/b/", "<html>B</html>", "failure");

  const list = storage.list();
  assert.equal(list.length, 2);
});

test("SnapshotStorage - purge", () => {
  const dir = makeTempDir();
  const storage = new SnapshotStorage({ storageDir: dir, storeOnFailure: true, samplingRate: 1 });

  storage.store("https://example.com/x/", "<html>X</html>", "sampled");
  storage.purge();

  const list = storage.list();
  assert.equal(list.length, 0);
});
