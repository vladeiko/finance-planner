import type { AppDocument } from './document';

/**
 * Где лежит документ. Замена хранилища (IndexedDB, файл в облаке) — новая реализация
 * этого интерфейса; остальные слои не меняются.
 * Ошибки — `StorageError`.
 */
export interface Repository {
  /** Сохранённый документ, приведённый к текущей версии; `undefined` — ещё ничего не сохраняли. */
  load(): Promise<AppDocument | undefined>;
  save(doc: AppDocument): Promise<void>;
  /** Сохранённые данные как есть, без разбора — чтобы спасти их, если `load()` не смог. */
  loadRaw(): Promise<string | undefined>;
}
