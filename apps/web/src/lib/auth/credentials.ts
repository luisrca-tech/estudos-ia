/** Credential check for the login. Pure and Web-API only, so the proxy can use it too. */

const encoder = new TextEncoder();

/** Compares two strings without exiting early, also when their lengths differ. */
export function timingSafeEqualText(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

/** True only when a password is configured and both user and password match. */
export function checkCredentials(
  given: { user: string; password: string },
  expected: { user: string; password: string | null | undefined },
): boolean {
  if (!expected.password) return false;
  // Both comparisons always run, so timing does not reveal which one failed.
  const userOk = timingSafeEqualText(given.user, expected.user);
  const passwordOk = timingSafeEqualText(given.password, expected.password);
  return userOk && passwordOk;
}
