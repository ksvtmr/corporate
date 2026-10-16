// Credential helpers for the mock backend. A production backend must use a
// slow KDF (argon2id/bcrypt); salted SHA-256 here only guarantees that no
// plaintext password is ever persisted in browser storage.

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  return Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export function randomId(prefix: string): string {
  return `${prefix}-${randomToken(6)}`;
}

async function sha256(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(input)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomToken(8);
  return `sha256:${salt}:${await sha256(`${salt}:${password}`)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'sha256' || !salt || !hash) return false;
  const candidate = await sha256(`${salt}:${password}`);
  // Constant-time comparison.
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
