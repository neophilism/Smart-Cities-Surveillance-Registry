import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginLimit } from "./admin-login-limit";
import {
  ADMIN_SESSION_SECONDS, authenticateAdminPrincipal, issueAdminSession,
  parseAdminPrincipals, readAdminSession,
} from "./admin-session";
import type { AdminSession } from "./admin-session";
export type { AdminSession } from "./admin-session";

const ADMIN_COOKIE = "civic_registry_admin";
const loginLimit = new AdminLoginLimit();
function configuredSecret(): string {
  // CIVIC_REGISTRY_ADMIN_TOKEN is retired; operators must not know the signing key.
  return (process.env.CIVIC_REGISTRY_ADMIN_SESSION_SECRET ?? "").trim();
}
function principals() {
  return parseAdminPrincipals(process.env.CIVIC_REGISTRY_ADMIN_PRINCIPALS ?? "");
}
export function adminConsoleConfigured(): boolean {
  return configuredSecret().length >= 32 && principals().length > 0;
}
export async function establishAdminSession(token: string): Promise<void> {
  if (!loginLimit.consume()) {
    throw new Error("Too many sign-in attempts. Try again in one minute.");
  }
  const secret = configuredSecret();
  const principal = authenticateAdminPrincipal(token, principals());
  if (secret.length < 32 || !principal) {
    throw new Error("Administrator credentials are invalid or the console is disabled.");
  }
  const value = issueAdminSession(principal, secret, Math.floor(Date.now() / 1000));
  const store = await cookies();
  store.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
}
export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
export async function getAdminSession(): Promise<AdminSession | null> {
  return readAdminSession(
    (await cookies()).get(ADMIN_COOKIE)?.value ?? "",
    configuredSecret(), principals(), Math.floor(Date.now() / 1000),
  );
}
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/sign-in");
  return session;
}
