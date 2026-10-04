import type { AppDocument } from './document';
import { StorageError } from './errors';
import { migrateDocument } from './migrations';
import type { Repository } from './repository';
import { getLocalStorage, readItem, writeItem } from './webStorage';

export const DOCUMENT_KEY = 'finance-planner:document';

/** Весь документ — одной JSON-строкой под одним ключом. */
export function createLocalStorageRepository(
  storage: Storage = getLocalStorage(),
  key = DOCUMENT_KEY,
): Repository {
  return {
    async load() {
      const raw = readItem(storage, key);
      if (raw === null) return undefined;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (cause) {
        throw new StorageError('invalid', 'Сохранённые данные повреждены: это не JSON.', { cause });
      }
      return migrateDocument(parsed);
    },
    async save(doc: AppDocument) {
      writeItem(storage, key, JSON.stringify(doc));
    },
  };
}
