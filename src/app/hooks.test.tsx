import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test } from 'vitest';
import { emptyDocument } from '../storage/document';
import { StorageError } from '../storage/errors';
import type { Repository } from '../storage/repository';
import { setStore, updateDoc, useDoc, useSaveError } from './hooks';
import { createStore } from './store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const container = document.createElement('div');
afterEach(() => (container.innerHTML = ''));

function Probe() {
  const count = useDoc((d) => d.accounts).length;
  const error = useSaveError();
  return <p>{`${count}:${error?.code ?? '-'}`}</p>;
}

test('useDoc и useSaveError следят за стором, updateDoc меняет документ', async () => {
  let fail = false;
  const repo: Repository = {
    load: async () => undefined,
    loadRaw: async () => undefined,
    save: async () => {
      if (fail) throw new StorageError('quota', 'нет места');
    },
  };
  const store = createStore(repo, emptyDocument());
  setStore(store);
  const root = createRoot(container);
  await act(async () => root.render(<Probe />));
  expect(container.textContent).toBe('0:-');

  fail = true;
  await act(async () => {
    updateDoc((d) => ({
      ...d,
      accounts: [{ id: 'a', updatedAt: '', name: 'A', kind: 'simple', role: 'regular', order: 0 }],
    }));
    await store.flush();
  });
  expect(container.textContent).toBe('1:quota');
  act(() => root.unmount());
});
