export const HEALTH_DECLARATION_STORAGE_KEY = 'my-app-health-declaration';
export const HEALTH_DECLARATION_STORAGE_VERSION = 1;
export const HEALTH_DECLARATION_STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredDraftEnvelope = {
  version?: number;
  timestamp?: number;
};

function safeLocalStorage<T>(operation: (storage: Storage) => T, fallback: T): T {
  try {
    return operation(globalThis.localStorage);
  } catch {
    return fallback;
  }
}

export function readHealthDeclarationDraft<T extends StoredDraftEnvelope>(): T | null {
  const stored = safeLocalStorage((storage) => storage.getItem(HEALTH_DECLARATION_STORAGE_KEY), null);

  try {
    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored) as T;
    const timestamp = typeof data.timestamp === 'number' ? data.timestamp : 0;
    if (
      data.version !== HEALTH_DECLARATION_STORAGE_VERSION ||
      Date.now() - timestamp > HEALTH_DECLARATION_STORAGE_MAX_AGE_MS
    ) {
      clearHealthDeclarationDraft();
      return null;
    }

    return data;
  } catch {
    clearHealthDeclarationDraft();
    return null;
  }
}

export function writeHealthDeclarationDraft(data: unknown): void {
  safeLocalStorage((storage) => storage.setItem(HEALTH_DECLARATION_STORAGE_KEY, JSON.stringify(data)), undefined);
}

export function clearHealthDeclarationDraft(): void {
  safeLocalStorage((storage) => storage.removeItem(HEALTH_DECLARATION_STORAGE_KEY), undefined);
}
