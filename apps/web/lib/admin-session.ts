import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export interface AdminPrincipal { actorId: string; roles: string[]; tokenSha256: string; }
export interface AdminSession { actorId: string; roles: string[]; expiresAt: number; }
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const equal = (a: string, b: string) => timingSafeEqual(
  Buffer.from(hash(a), "hex"), Buffer.from(hash(b), "hex"),
);
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");
const fingerprint = (principal: AdminPrincipal) => hash(JSON.stringify(principal));

/** Invalid or ambiguous server configuration disables all built-in logins. */
export function parseAdminPrincipals(source: string): AdminPrincipal[] {
  if (!source || source.length > 65536) return [];
  try {
    const value: unknown = JSON.parse(source);
    if (!Array.isArray(value) || value.length === 0 || value.length > 100) return [];
    const actors = new Set<string>();
    const tokens = new Set<string>();
    const result: AdminPrincipal[] = [];
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const entry = item as Record<string, unknown>;
      if (typeof entry.actorId !== "string" || !entry.actorId.trim() ||
          entry.actorId !== entry.actorId.trim() || entry.actorId.length > 200 ||
          /[\u0000-\u001f\u007f]/.test(entry.actorId) ||
          typeof entry.tokenSha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.tokenSha256) ||
          !Array.isArray(entry.roles) || entry.roles.length > 50 ||
          !entry.roles.every((role: unknown) => typeof role === "string" &&
            /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(role))) return [];
      if (actors.has(entry.actorId) || tokens.has(entry.tokenSha256)) return [];
      actors.add(entry.actorId); tokens.add(entry.tokenSha256);
      result.push({ actorId: entry.actorId, tokenSha256: entry.tokenSha256,
        roles: [...new Set(entry.roles as string[])].sort() });
    }
    return result;
  } catch { return []; }
}
export function authenticateAdminPrincipal(token: string, principals: AdminPrincipal[]): AdminPrincipal | null {
  if (token.length < 32 || token.length > 1024) return null;
  const digest = hash(token);
  let match: AdminPrincipal | null = null;
  for (const principal of principals) {
    if (equal(digest, principal.tokenSha256)) match = principal;
  }
  return match;
}
export function issueAdminSession(principal: AdminPrincipal, secret: string, nowSeconds: number): string {
  if (secret.length < 32 || !Number.isSafeInteger(nowSeconds)) throw new Error("Administrator session configuration is invalid.");
  const payload = Buffer.from(JSON.stringify({
    version: 2, actorId: principal.actorId, roles: principal.roles,
    principalFingerprint: fingerprint(principal), expiresAt: nowSeconds + ADMIN_SESSION_SECONDS,
  })).toString("base64url");
  return payload + "." + signature(payload, secret);
}
export function readAdminSession(value: string, secret: string, principals: AdminPrincipal[], nowSeconds: number): AdminSession | null {
  if (secret.length < 32 || value.length > 8192 || !Number.isSafeInteger(nowSeconds)) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [payload, suppliedSignature] = parts;
  if (!equal(suppliedSignature, signature(payload, secret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session || session.version !== 2 || !Number.isSafeInteger(session.expiresAt) ||
        session.expiresAt <= nowSeconds || session.expiresAt > nowSeconds + ADMIN_SESSION_SECONDS) return null;
    const principal = principals.find((entry) => entry.actorId === session.actorId);
    if (!principal || session.principalFingerprint !== fingerprint(principal) ||
        JSON.stringify(session.roles) !== JSON.stringify(principal.roles)) return null;
    return { actorId: principal.actorId, roles: [...principal.roles], expiresAt: session.expiresAt };
  } catch { return null; }
}
