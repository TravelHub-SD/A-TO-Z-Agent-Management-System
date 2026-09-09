import bcrypt from "bcryptjs";

/**
 * bcrypt with cost 12. `bcryptjs` is used rather than the native binding so
 * the app builds and runs identically on any host, including serverless.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Burn roughly the same time as a real comparison when the email does not
 * exist, so response timing does not reveal which accounts are registered.
 */
const DUMMY_HASH = "$2a$12$M8bC9gtCU3W3nZ7Vv3xN0uCf7pJcOtC1YQ0qz0mF3o5U1oZC2vN2q";

export async function fakeVerify(): Promise<void> {
  await bcrypt.compare("timing-equalizer", DUMMY_HASH).catch(() => false);
}
