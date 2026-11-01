import { pathToFileURL } from "node:url";

export function validateSearchProbeTarget(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) ||
      !["127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password ||
      !/^\/registries\/[^/]+\/search\/?$/.test(url.pathname)) {
    throw new Error("Search load probes require an explicit loopback registry search URL without credentials.");
  }
  return url;
}

export async function probeLocalSearch({ url, requests = 20, concurrency = 2, timeoutMs = 5000, fetchImpl = fetch }) {
  const target = validateSearchProbeTarget(url);
  if (!Number.isInteger(requests) || requests < 1 || requests > 50 ||
      !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4 ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) {
    throw new Error("Probe limits must be 1–50 requests, 1–4 workers, and 1–10000ms timeout.");
  }
  let next = 0;
  const observations = [];
  const started = performance.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, async () => {
    while (next < requests) {
      const index = next++;
      const begin = performance.now();
      let status = null;
      let error = null;
      try {
        const response = await fetchImpl(target, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
        status = response.status;
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`HTTP ${status}`);
        }
        if (response.body) {
          const reader = response.body.getReader();
          let bytes = 0;
          try {
            while (true) {
              const part = await reader.read();
              if (part.done) break;
              bytes += part.value.byteLength;
              if (bytes > 2 * 1024 * 1024) {
                await reader.cancel();
                throw new Error("Search HTML exceeded the probe's 2MiB body limit.");
              }
            }
          } finally { reader.releaseLock(); }
        }
      } catch (failure) { error = failure instanceof Error ? failure.message : "Request failed"; }
      observations.push({ index, status, error, durationMs: performance.now() - begin });
    }
  }));
  const latencies = observations.map((entry) => entry.durationMs).sort((a, b) => a - b);
  const percentile = (fraction) => latencies[Math.max(0, Math.ceil(latencies.length * fraction) - 1)];
  return { requests, concurrency, elapsedMs: performance.now() - started,
    succeeded: observations.filter((entry) => !entry.error).length,
    failed: observations.filter((entry) => entry.error).length,
    p50Ms: percentile(.5), p95Ms: percentile(.95),
    observations: observations.sort((a, b) => a.index - b.index) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await probeLocalSearch({ url: process.argv[2] }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
