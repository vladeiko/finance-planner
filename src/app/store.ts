import { StorageError } from '../storage/errors';
import type { AppDocument } from '../storage/document';
import type { Repository } from '../storage/repository';

export type Action = (doc: AppDocument) => AppDocument;

export interface Store {
  get(): AppDocument;
  /** Ошибка последнего сохранения; снимается следующим успешным. */
  getSaveError(): StorageError | undefined;
  subscribe(listener: () => void): () => void;
  /** Применяет action, оповещает подписчиков и сохраняет документ. */
  update(action: Action): void;
  /** Ждёт завершения всех начатых сохранений. */
  flush(): Promise<void>;
}

function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  return new StorageError('unavailable', 'Не удалось сохранить данные.', { cause: error });
}

export function createStore(repo: Repository, initial: AppDocument): Store {
  let doc = initial;
  let saveError: StorageError | undefined;
  let saving: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    get: () => doc,
    getSaveError: () => saveError,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(action) {
      const next = action(doc);
      if (next === doc) return;
      doc = next;
      notify();
      // Сохранения идут строго по очереди, чтобы старое не легло поверх нового.
      saving = saving.then(() =>
        repo.save(next).then(
          () => {
            if (saveError === undefined) return;
            saveError = undefined;
            notify();
          },
          (error: unknown) => {
            saveError = toStorageError(error);
            notify();
          },
        ),
      );
    },
    flush: () => saving,
  };
}
