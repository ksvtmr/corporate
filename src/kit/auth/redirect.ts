/**
 * Only same-app paths are accepted as post-login redirects (no open redirect).
 * Backslashes and protocol-relative forms are rejected explicitly because some
 * router versions normalise "\\" to "/" (react-router advisory CVE-2025-68470).
 */
export function safeRedirect(from: unknown): string {
  if (typeof from !== 'string' || !/^\/corporate\/[\w\-/?=&%.]*$/.test(from) || from.includes('//')) return '/corporate/dashboard';
  return from;
}
