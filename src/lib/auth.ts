export const AUTH_COOKIE = "cco_ev_session";

// Duración de la sesión. Vive dentro del token firmado, no solo en el maxAge
// de la cookie: el maxAge lo respeta el navegador, pero un token copiado a
// mano lo ignora por completo.
export const SESSION_SEGUNDOS = 30 * 24 * 60 * 60;
const SESSION_MS = SESSION_SEGUNDOS * 1000;

// Sin respaldo de fábrica: si APP_PASSWORD no está configurada, todo intento
// de acceso falla — nunca se cae a una contraseña conocida y pública (el
// código de este repositorio es público en GitHub).
function getAppPassword(): string | null {
  return process.env.APP_PASSWORD || null;
}

// Para que el servidor pueda responder "falta la variable" en vez de
// "contraseña incorrecta". No revela nada aprovechable: si no está
// configurada, no hay sesión que proteger — nadie puede entrar, ni con la
// contraseña correcta.
export function isAppPasswordConfigured(): boolean {
  return getAppPassword() !== null;
}

async function digest(valor: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor)));
}

// Comparación en tiempo constante sobre digests de longitud fija.
//
// Se comparan los hashes y no las cadenas crudas a propósito: comparar las
// cadenas obliga a cortar antes cuando los largos no coinciden, y esa salida
// temprana filtra la longitud del secreto — justo la fuga que una comparación
// de este tipo existe para evitar. Con SHA-256 ambos lados miden siempre 32
// bytes y el recorrido es idéntico pase lo que pase.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
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

// El token lleva su propio vencimiento y un nonce, y va firmado entero.
//
// Antes era el HMAC de una cadena fija: el mismo valor en cada login y sin
// caducidad. Eso significaba que un token filtrado servía para siempre —hasta
// cambiar APP_PASSWORD, que echa a todo el mundo de una vez— y que ninguna
// sesión podía vencer del lado del servidor.
export async function createSessionToken(): Promise<string | null> {
  const password = getAppPassword();
  if (!password) return null;
  const payload = `v2.${Date.now() + SESSION_MS}.${crypto.randomUUID()}`;
  return `${payload}.${await sign(payload, password)}`;
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const password = getAppPassword();
  if (!password) return false;
  return safeEqual(candidate, password);
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const password = getAppPassword();
  if (!password) return false;

  const partes = token.split(".");
  if (partes.length !== 4 || partes[0] !== "v2") return false;
  const [, expiraEnRaw, nonce, firma] = partes;

  // La firma se verifica ANTES de mirar el vencimiento. Al revés, la fecha que
  // se estaría leyendo es la que mandó el cliente y no la que firmó el
  // servidor: cualquiera se extendería la sesión editando ese número.
  const payload = `v2.${expiraEnRaw}.${nonce}`;
  if (!(await safeEqual(firma, await sign(payload, password)))) return false;

  const expiraEn = Number(expiraEnRaw);
  return Number.isFinite(expiraEn) && Date.now() < expiraEn;
}
