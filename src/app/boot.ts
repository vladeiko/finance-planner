import { emptyDocument } from '../storage/document';
import { StorageError } from '../storage/errors';
import type { Repository } from '../storage/repository';
import { createStore, type Store } from './store';

export type BootResult =
  | { status: 'ready'; store: Store }
  | { status: 'failed'; error: StorageError; raw: string | undefined };

/**
 * Загружает документ и создаёт стор. Если загрузить не удалось, стор не создаётся —
 * автосохранение затёрло бы данные, которые ещё можно спасти (`raw`).
 */
export async function boot(repo: Repository): Promise<BootResult> {
  try {
    const doc = (await repo.load()) ?? emptyDocument();
    return { status: 'ready', store: createStore(repo, doc) };
  } catch (error) {
    const storageError =
      error instanceof StorageError
        ? error
        : new StorageError('invalid', 'Не удалось прочитать сохранённые данные.', { cause: error });
    const raw = await repo.loadRaw().catch(() => undefined);
    return { status: 'failed', error: storageError, raw };
  }
}
