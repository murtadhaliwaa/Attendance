/**
 * ذاكرة مؤقتة بسيطة لبيانات نادراً ما تتغيّر (شفتات، أقسام افتراضية).
 * TTL قصير — مناسب لـ Next.js dev و production على instance واحد.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createTTLCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): T | null {
      if (!entry || Date.now() >= entry.expiresAt) return null;
      return entry.value;
    },
    set(value: T) {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    invalidate() {
      entry = null;
    },
  };
}

/** علَم عملية — يمنع استعلام count المتكرر لـ ensureDefaultDepartments */
let defaultDepartmentsEnsured = false;

export function markDefaultDepartmentsEnsured() {
  defaultDepartmentsEnsured = true;
}

export function areDefaultDepartmentsEnsured() {
  return defaultDepartmentsEnsured;
}

export function resetDefaultDepartmentsFlag() {
  defaultDepartmentsEnsured = false;
}
