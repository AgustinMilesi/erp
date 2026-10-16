import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt with the parameters OWASP lists (N=2^15, r=8, p=3). They travel inside the
// stored hash, so they can be raised later without breaking existing passwords.
const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      length,
      { N: n, r, p, maxmem: 256 * n * r },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "base64");
    const actual = await derive(
      password,
      Buffer.from(salt, "base64"),
      Number(n),
      Number(r),
      Number(p),
      expected.length,
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Used when the email doesn't exist, so the response takes as long as a real check.
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummyHash);
}
