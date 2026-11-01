import { redirect } from "next/navigation";

import {
  adminConsoleConfigured,
  getAdminSession,
} from "../../../lib/admin-auth";
import { signInAdmin } from "../actions";

export const dynamic = "force-dynamic";

interface SignInPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AdminSignInPage({
  searchParams,
}: SignInPageProps) {
  if (await getAdminSession()) {
    redirect("/admin");
  }

  const { error } = await searchParams;
  const configured =
    adminConsoleConfigured();

  return (
    <main className="page-shell admin-signin">
      <section className="empty-state">
        <p className="eyebrow">
          Administrator console
        </p>
        <h1>Operator access</h1>
        <p>
          Administrative operations use a signed, HTTP-only session.
          Your operator identity and workflow roles are assigned
          by the server configuration.
        </p>

        {!configured ? (
          <div className="notice">
            The operator console is not configured. Contact the administrator.
          </div>
        ) : null}

        {error ? (
          <div
            className="admin-message admin-message--error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <form
          className="admin-form"
          action={signInAdmin}
        >
          <label>
            <span>Administrator token</span>
            <input
              name="token"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <div className="admin-actions">
            <button
              type="submit"
              disabled={!configured}
            >
              Sign in
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
