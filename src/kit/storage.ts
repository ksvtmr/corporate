// Browser storage keys are namespaced per deployment. Preview deployments are
// served from the same origin as production (GitHub Pages sub-folders), so
// without a namespace a preview build could read — and migrate — the demo
// database, sessions and drafts that a visitor created on the production site.
// Production and local development leave VITE_STORAGE_NAMESPACE empty, which
// keeps the historical key names and therefore existing visitors' data.

export const STORAGE_NAMESPACE = ((import.meta.env?.VITE_STORAGE_NAMESPACE as string | undefined) ?? '').trim();

export function storageKey(name: string): string {
  return STORAGE_NAMESPACE ? `${STORAGE_NAMESPACE}:${name}` : name;
}
