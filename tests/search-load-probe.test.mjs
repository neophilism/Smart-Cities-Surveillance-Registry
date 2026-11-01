import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { probeLocalSearch, validateSearchProbeTarget } from "../scripts/search-load-probe.mjs";
const url = "http://127.0.0.1:3000/registries/demo/search?q=policy";
test("load probe rejects external, credentialed and non-search targets", () => {
  for (const value of ["https://example.org/registries/demo/search", "http://localhost:3000/registries/demo/search",
    "http://user:secret@127.0.0.1/registries/demo/search", "http://127.0.0.1/admin"]) {
    assert.throws(() => validateSearchProbeTarget(value), /loopback/);
  }
});
test("load probe bounds concurrency and reports actual failures separately", async () => {
  let active = 0; let peak = 0; let count = 0;
  const report = await probeLocalSearch({ url, requests: 8, concurrency: 2, fetchImpl: async (_url, init) => {
    assert.equal(init.redirect, "manual");
    active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    active--;
    return new Response("fixture", { status: ++count === 3 ? 503 : 200 });
  } });
  assert.equal(peak, 2); assert.equal(report.succeeded, 7); assert.equal(report.failed, 1);
  assert.equal(report.observations.length, 8);
  assert.ok(report.p95Ms >= report.p50Ms);
});
test("load probe refuses unbounded budgets and oversized HTML", async () => {
  await assert.rejects(probeLocalSearch({ url, requests: 1000 }), /limits/);
  const report = await probeLocalSearch({ url, requests: 1, fetchImpl: async () =>
    new Response(new Uint8Array(2 * 1024 * 1024 + 1)) });
  assert.equal(report.failed, 1); assert.match(report.observations[0].error, /body limit/);
});

test("native HTTP probe counts real loopback responses and times out stalled requests", async () => {
  let received = 0;
  const server = createServer((request, response) => {
    received++;
    if (request.url.includes("stall")) return;
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end("<main><h1>Synthetic search fixture</h1></main>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const target = `http://127.0.0.1:${server.address().port}/registries/demo/search`;
  try {
    const report = await probeLocalSearch({ url: target, requests: 4, concurrency: 2 });
    assert.equal(received, 4); assert.equal(report.succeeded, 4); assert.equal(report.failed, 0);
    const stalled = await probeLocalSearch({ url: target + "?stall=1", requests: 1, timeoutMs: 50 });
    assert.equal(stalled.failed, 1); assert.match(stalled.observations[0].error, /timeout|aborted/i);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
