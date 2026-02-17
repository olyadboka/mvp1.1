/**
 * When NEXT_PUBLIC_API_URL is set (e.g. to your Railway backend URL), all API
 * requests go there. Leave unset when frontend and backend are on the same host.
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!base) return path;
  const normalized = base.replace(/\/$/, "");
  return path.startsWith("/") ? `${normalized}${path}` : `${normalized}/${path}`;
}
