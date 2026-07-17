export const AUTH_COOKIE = "cco_ev_session";

const DEFAULT_PASSWORD = "cco-ev-2026";

function getAppPassword(): string {
  return process.env.APP_PASSWORD || DEFAULT_PASSWORD;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAppPassword()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string> {
  return sign("cco-ev-authenticated");
}

export async function checkPassword(candidate: string): Promise<boolean> {
  return candidate === getAppPassword();
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await createSessionToken();
  return token === expected;
}
