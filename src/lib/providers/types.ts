export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function isConfigured(...vars: (string | undefined)[]): boolean {
  return vars.every((v) => typeof v === "string" && v.trim().length > 0);
}
