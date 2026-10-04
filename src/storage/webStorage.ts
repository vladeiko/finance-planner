import { StorageError } from './errors';

/** `Storage` (localStorage), если браузер его даёт; иначе `StorageError('unavailable')`. */
export function getLocalStorage(): Storage {
  try {
    return globalThis.localStorage;
  } catch (cause) {
    throw new StorageError('unavailable', 'Хранилище браузера недоступно.', { cause });
  }
}

export function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch (cause) {
    throw new StorageError('unavailable', 'Не удалось прочитать данные из хранилища браузера.', {
      cause,
    });
  }
}

export function writeItem(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'QuotaExceededError') {
      throw new StorageError('quota', 'Не хватает места в хранилище браузера.', { cause });
    }
    throw new StorageError('unavailable', 'Не удалось сохранить данные в хранилище браузера.', {
      cause,
    });
  }
}
