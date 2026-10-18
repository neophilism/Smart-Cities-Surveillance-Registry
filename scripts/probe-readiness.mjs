import { pathToFileURL } from "node:url";

export async function probeReadiness(baseUrl, options = {}) {
  let url;
  try { url = new URL(baseUrl); } catch { throw new Error("Readiness URL must be an HTTPS origin"); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Readiness URL must be an HTTPS origin");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(new URL("/api/ready", url), {
    method: "GET", redirect: "error",
    signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
  });
  if (response.status !== 200) throw new Error("Readiness endpoint returned non-200");
  const body = await response.json();
  if (body?.status !== "ready" || body?.service !== "smart-cities-surveillance-registry") {
    throw new Error("Readiness payload is not ready for this service");
  }
  return { ready: true, checkedAt: new Date().toISOString() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  probeReadiness(process.env.READY_BASE_URL ?? "")
    .then(() => { process.stdout.write("Readiness verified\n"); })
    .catch((error) => { process.stderr.write(error.message + "\n"); process.exitCode = 1; });
}
