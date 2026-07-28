export const AUTH_COOKIE = "cco_ev_session";

// Sin respaldo de fábrica: si APP_PASSWORD no está configurada, todo intento
// de acceso falla — nunca se cae a una contraseña conocida y pública (el
// código de este repositorio es público en GitHub).
function getAppPassword(): string | null {
  return process.env.APP_PASSWORD || null;
}

// Comparación en tiempo constante — evita que la diferencia de tiempo entre
// respuestas revele cuántos caracteres coinciden.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sign(payload: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string | null> {
  const password = getAppPassword();
  if (!password) return null;
  return sign("cco-ev-authenticated", password);
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const password = getAppPassword();
  if (!password) return false;
  return safeEqual(candidate, password);
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await createSessionToken();
  if (!expected) return false;
  return safeEqual(token, expected);
}
