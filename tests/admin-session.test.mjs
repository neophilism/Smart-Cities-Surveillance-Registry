import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import {
  authenticateAdminPrincipal, issueAdminSession, parseAdminPrincipals,
  readAdminSession, ADMIN_SESSION_SECONDS,
} from "../apps/web/lib/admin-session.ts";

const token = "synthetic-test-token-".repeat(3);
const secret = "synthetic-signing-secret-".repeat(3);
const principal = { actorId: "test-editor", roles: ["editor"],
  tokenSha256: createHash("sha256").update(token).digest("hex") };
const principals = parseAdminPrincipals(JSON.stringify([principal]));
const now = 1700000000;
const cookie = () => issueAdminSession(principals[0], secret, now);
const signed = (value) => {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return payload + "." + createHmac("sha256", secret).update(payload).digest("base64url");
};

test("credentials bind actor and roles to server principals", () => {
  assert.deepEqual(authenticateAdminPrincipal(token, principals), principal);
  for (const invalid of ["", "short", "x".repeat(1025), secret, token + "x"]) {
    assert.equal(authenticateAdminPrincipal(invalid, principals), null);
  }
  assert.deepEqual(readAdminSession(cookie(), secret, principals, now), {
    actorId: "test-editor", roles: ["editor"], expiresAt: now + ADMIN_SESSION_SECONDS,
  });
});

test("malformed, duplicate and ambiguous principal configuration fails closed", () => {
  for (const invalid of ["", "{", "null", "{}", "[]", "x".repeat(65537),
    JSON.stringify([principal, principal]),
    JSON.stringify([principal, { ...principal, actorId: "another-editor" }]),
    JSON.stringify([{ ...principal, actorId: " editor " }]),
    JSON.stringify([{ ...principal, roles: ["admin,owner"] }]),
    JSON.stringify([{ ...principal, tokenSha256: "invalid" }])]) {
    assert.deepEqual(parseAdminPrincipals(invalid), []);
  }
});

test("session expiry, tampering, malformed cookies and key rotation deny access", () => {
  assert.equal(readAdminSession(cookie(), secret, principals, now + ADMIN_SESSION_SECONDS), null);
  assert.equal(readAdminSession(cookie(), secret + "rotation", principals, now), null);
  for (const value of ["", "a.b.c", "a.b", cookie()+".extra", "x".repeat(8193), "!"+cookie()]) {
    assert.equal(readAdminSession(value, secret, principals, now), null);
  }
  const [payload, signature] = cookie().split(".");
  const changed = JSON.parse(Buffer.from(payload, "base64url").toString());
  changed.roles = ["publisher"];
  assert.equal(readAdminSession(Buffer.from(JSON.stringify(changed)).toString("base64url")+"."+signature,
    secret, principals, now), null);
  // Even correctly signed payloads cannot grant roles absent from current config.
  assert.equal(readAdminSession(signed(changed), secret, principals, now), null);
});

test("principal removal, role reduction and credential rotation revoke sessions", () => {
  assert.equal(readAdminSession(cookie(), secret, [], now), null);
  for (const change of [{ roles: [] }, { actorId: "another-editor" }, { tokenSha256: "a".repeat(64) }]) {
    assert.equal(readAdminSession(cookie(), secret, [{ ...principal, ...change }], now), null);
  }
});

test("legacy cookies and impossible expiration values are rejected", () => {
  for (const value of [
    { actorId: "test-editor", roles: ["publisher"], expiresAt: now + 60 },
    { version: 2, actorId: "test-editor", roles: ["editor"], expiresAt: "forever" },
    { version: 2, actorId: "test-editor", roles: ["editor"], expiresAt: now + ADMIN_SESSION_SECONDS + 1 },
  ]) assert.equal(readAdminSession(signed(value), secret, principals, now), null);
  assert.throws(() => issueAdminSession(principal, "short", now));
});
