// Validation rules shared by forms and the (mock) backend so client-side
// checks are always backed by identical server-side checks.

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/;
export const PASSWORD_MIN_LENGTH = 8;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** ≥ 8 characters with at least one letter (any supported alphabet) and one digit. */
export function isStrongPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= 128 &&
    /[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(value) &&
    /\d/.test(value)
  );
}
