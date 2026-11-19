/** Ends the session with a POST (never a GET link) and goes to the login page. */
export async function signOut(): Promise<void> {
  try {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin", redirect: "manual" });
  } finally {
    window.location.assign("/login");
  }
}
