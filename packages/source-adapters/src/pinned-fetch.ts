import https from "node:https";
import { isIP } from "node:net";

/** Connect to the address already checked by the caller, retaining TLS identity. */
export function pinnedSourceOptions(url: URL, address: string, headers: Record<string, string>) {
  if (!isIP(address)) throw new Error("Source DNS returned an invalid address.");
  return {
    protocol: "https:", hostname: address, port: url.port || 443,
    servername: url.hostname.replace(/^\[|\]$/g, ""),
    method: "GET", path: url.pathname + url.search,
    headers: { ...headers, "accept-encoding": "identity", host: url.host },
    // Never reuse a connection selected for a different DNS validation.
    agent: false as const,
  };
}

export function fetchPinnedSource(
  url: URL, address: string, headers: Record<string, string>,
  signal: AbortSignal, maxBytes: number,
  requestImpl: typeof https.request = https.request,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = requestImpl(pinnedSourceOptions(url, address, headers), (incoming) => {
      if (incoming.headers["content-encoding"] && incoming.headers["content-encoding"] !== "identity") {
        request.destroy(new Error("Source returned unsupported compressed content despite identity encoding request."));
        return;
      }
      const responseHeaders = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(key, item));
        else if (value !== undefined) responseHeaders.set(key, value);
      }
      const chunks: Buffer[] = [];
      let length = 0;
      incoming.on("data", (chunk: Buffer) => {
        length += chunk.byteLength;
        if (length > maxBytes) {
          request.destroy(new Error(`Source response exceeds configured size limit of ${maxBytes} bytes.`));
        } else chunks.push(chunk);
      });
      incoming.on("error", reject);
      incoming.on("end", () => {
        if (length > maxBytes) return;
        const status = incoming.statusCode ?? 502;
        const body = [204, 205, 304].includes(status) ? null : new Uint8Array(Buffer.concat(chunks));
        resolve(new Response(body, { status, headers: responseHeaders }));
      });
    });
    const abort = () => request.destroy(new Error("Source request timed out or was aborted."));
    request.on("error", reject);
    request.on("close", () => signal.removeEventListener("abort", abort));
    if (signal.aborted) abort();
    else { signal.addEventListener("abort", abort, { once: true }); request.end(); }
  });
}
