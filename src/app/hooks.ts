import { useSyncExternalStore } from 'react';
import type { AppDocument } from '../storage/document';
import type { StorageError } from '../storage/errors';
import type { Action, Store } from './store';

let current: Store | undefined;

/** Подключает стор, созданный при старте; до этого хуки не работают. */
export function setStore(store: Store): void {
  current = store;
}

function store(): Store {
  if (current === undefined) throw new Error('Стор не подключён: вызовите setStore() при старте');
  return current;
}

/**
 * Часть документа. Селектор должен возвращать существующую ссылку (`d => d.accounts`);
 * производные данные — через `useMemo` поверх результата.
 */
export function useDoc<T>(selector: (doc: AppDocument) => T): T {
  const s = store();
  return useSyncExternalStore(s.subscribe, () => selector(s.get()));
}

export function useSaveError(): StorageError | undefined {
  const s = store();
  return useSyncExternalStore(s.subscribe, s.getSaveError);
}

/** Применяет action к документу стора. */
export function updateDoc(action: Action): void {
  store().update(action);
}
