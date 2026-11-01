import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import { createPublicSourceClient, publicSourceFetchInternals } from "../packages/source-adapters/src/fetch.ts";
import { fetchPinnedSource, pinnedSourceOptions } from "../packages/source-adapters/src/pinned-fetch.ts";

test("source address guard rejects alternate private and transition address forms", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "::ffff:127.0.0.1", "::ffff:7f00:1",
    "0:0:0:0:0:ffff:7f00:1", "64:ff9b::7f00:1", "2001::1", "2001:01ff::1",
    "2002:7f00:1::", "ff02::1", "fe80::1", "2001:db8::1", "3fff::1"]) {
    assert.equal(publicSourceFetchInternals.isPrivateAddress(address), true, address);
  }
  for (const address of ["8.8.8.8", "2606:4700:4700::1111", "2001:4860:4860::8888"]) {
    assert.equal(publicSourceFetchInternals.isPrivateAddress(address), false, address);
  }
});
test("mixed public/private DNS answers fail before HTTP is attempted", async () => {
  let fetched = false;
  const client = createPublicSourceClient({
    dnsLookup: async () => [{ address: "8.8.8.8", family: 4 }, { address: "::ffff:7f00:1", family: 6 }],
    fetchImpl: async () => { fetched = true; return new Response("unsafe"); },
  });
  await assert.rejects(client.fetchBytes("https://example.gov/file.pdf", ["example.gov"]), /private, local, or reserved/);
  assert.equal(fetched, false);
});
test("redirects to allowed hosts repeat DNS validation", async () => {
  let calls = 0;
  const client = createPublicSourceClient({
    dnsLookup: async () => [{ address: ++calls === 1 ? "8.8.8.8" : "127.0.0.1", family: 4 }],
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: "/private" } }),
  });
  await assert.rejects(client.fetchText("https://example.gov/page", ["example.gov"]), /private, local, or reserved/);
  assert.equal(calls, 2);
});
test("pinned transport retains original TLS and Host identity without another DNS lookup", async () => {
  const url = new URL("https://example.gov:8443/file.pdf?version=2");
  const options = pinnedSourceOptions(url, "8.8.8.8", { accept: "application/pdf" });
  assert.equal(options.hostname, "8.8.8.8");
  assert.equal(options.servername, "example.gov");
  assert.equal(options.headers.host, "example.gov:8443");
  assert.equal(options.path, "/file.pdf?version=2");
  assert.equal(options.agent, false);
  assert.throws(() => pinnedSourceOptions(url, "attacker.example", {}), /invalid address/);
  const response = await fetchPinnedSource(url, "8.8.8.8", {}, new AbortController().signal, 20,
    fakeRequest("%PDF-test", (actual) => assert.equal(actual.hostname, "8.8.8.8")));
  assert.equal(await response.text(), "%PDF-test");
});
function fakeRequest(body, inspect = () => {}) {
  return (options, callback) => {
    inspect(options);
    const request = new EventEmitter();
    request.destroy = (error) => { request.emit("error", error); request.emit("close"); return request; };
    request.end = () => queueMicrotask(() => {
      const incoming = new PassThrough();
      incoming.headers = { "content-type": "application/pdf" };
      incoming.statusCode = 200;
      callback(incoming);
      incoming.on("end", () => request.emit("close"));
      incoming.end(Buffer.from(body));
    });
    return request;
  };
}
test("pinned transport rejects oversized bodies and aborted requests", async () => {
  const url = new URL("https://example.gov/file.pdf");
  await assert.rejects(fetchPinnedSource(url, "8.8.8.8", {}, new AbortController().signal,
    5, fakeRequest("123456")), /size limit/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchPinnedSource(url, "8.8.8.8", {}, controller.signal,
    20, fakeRequest("unused")), /aborted/);
});

test("invalid limits fail closed and stalled DNS has a bounded timeout", async () => {
  for (const options of [{ timeoutMs: Infinity }, { timeoutMs: 0 }, { maxResponseBytes: NaN },
    { maxResponseBytes: -1 }, { maxRedirects: 100 }]) {
    assert.throws(() => createPublicSourceClient(options), /limits are invalid/);
  }
  const client = createPublicSourceClient({ timeoutMs: 5, dnsLookup: () => new Promise(() => {}) });
  await assert.rejects(client.fetchBytes("https://example.gov/file.pdf", ["example.gov"]), /DNS lookup timed out/);
});
