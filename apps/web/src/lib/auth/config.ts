/** Lock settings from the env. Server only (proxy, route handlers, server components). */
import { ENV } from "@/env";

const DEFAULT_USER = "luis";
let warnedMissingSecret = false;

export type AuthConfig = {
  /** False while APP_PASSWORD is unset: no login, everything open. */
  enabled: boolean;
  user: string;
  password: string | undefined;
  /** Undefined when missing: the lock then fails closed. */
  secret: string | undefined;
};

export function getAuthConfig(): AuthConfig {
  const password = ENV.APP_PASSWORD || undefined;
  const secret = ENV.APP_SESSION_SECRET || undefined;
  if (password && !secret && !warnedMissingSecret) {
    warnedMissingSecret = true;
    console.error(
      "[auth] APP_PASSWORD is set but APP_SESSION_SECRET is missing: nobody can log in until it is set (32+ random characters).",
    );
  }
  return { enabled: Boolean(password), user: ENV.APP_USER || DEFAULT_USER, password, secret };
}
