export const HEALTH_DECLARATION_STORAGE_KEY = 'my-app-health-declaration';
export const HEALTH_DECLARATION_STORAGE_VERSION = 1;
export const HEALTH_DECLARATION_STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredDraftEnvelope = {
  version?: number;
  timestamp?: number;
};

export function readHealthDeclarationDraft<T extends StoredDraftEnvelope>(): T | null {
  try {
    const stored = localStorage.getItem(HEALTH_DECLARATION_STORAGE_KEY);
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
  try {
    localStorage.setItem(HEALTH_DECLARATION_STORAGE_KEY, JSON.stringify(data));
  } catch {
  }
}

export function clearHealthDeclarationDraft(): void {
  try {
    localStorage.removeItem(HEALTH_DECLARATION_STORAGE_KEY);
  } catch {
  }
}
