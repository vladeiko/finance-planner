import { describe, expect, test } from 'vitest';
import type { AppDocument } from '../storage/document';
import { emptyDocument } from '../storage/document';
import { StorageError } from '../storage/errors';
import type { Repository } from '../storage/repository';
import { createStore } from './store';

function fakeRepo(save: (doc: AppDocument) => Promise<void> = async () => {}) {
  const saved: AppDocument[] = [];
  const repo: Repository = {
    load: async () => undefined,
    loadRaw: async () => undefined,
    save: async (doc) => {
      await save(doc);
      saved.push(doc);
    },
  };
  return { repo, saved };
}

const rename = (doc: AppDocument): AppDocument => ({ ...doc, accounts: [] });

describe('createStore', () => {
  test('update применяет action, оповещает и сохраняет', async () => {
    const { repo, saved } = fakeRepo();
    const store = createStore(repo, emptyDocument());
    let calls = 0;
    store.subscribe(() => calls++);
    const before = store.get();
    store.update(rename);
    expect(store.get()).not.toBe(before);
    expect(calls).toBe(1);
    await store.flush();
    expect(saved).toEqual([store.get()]);
  });

  test('action вернул тот же документ — ни оповещения, ни сохранения', async () => {
    const { repo, saved } = fakeRepo();
    const store = createStore(repo, emptyDocument());
    let calls = 0;
    store.subscribe(() => calls++);
    store.update((d) => d);
    await store.flush();
    expect(calls).toBe(0);
    expect(saved).toEqual([]);
  });

  test('сохранения идут по очереди', async () => {
    const order: number[] = [];
    const { repo } = fakeRepo(async (doc) => {
      const n = doc.accounts.length;
      await new Promise((r) => setTimeout(r, n === 1 ? 20 : 0));
      order.push(n);
    });
    const store = createStore(repo, emptyDocument());
    const add = (d: AppDocument): AppDocument => ({
      ...d,
      accounts: [
        ...d.accounts,
        {
          id: String(d.accounts.length),
          updatedAt: '',
          name: '',
          kind: 'simple',
          role: 'regular',
          order: 0,
        },
      ],
    });
    store.update(add);
    store.update(add);
    await store.flush();
    expect(order).toEqual([1, 2]);
  });

  test('ошибка сохранения запоминается, правка в памяти остаётся; успех её снимает', async () => {
    let fail = true;
    const { repo } = fakeRepo(async () => {
      if (fail) throw new StorageError('quota', 'нет места');
    });
    const store = createStore(repo, emptyDocument());
    let calls = 0;
    store.subscribe(() => calls++);
    store.update(rename);
    await store.flush();
    expect(store.getSaveError()?.code).toBe('quota');
    expect(store.get().accounts).toEqual([]);
    fail = false;
    store.update((d) => ({ ...d }));
    await store.flush();
    expect(store.getSaveError()).toBeUndefined();
    expect(calls).toBe(4);
  });

  test('неожиданная ошибка сохранения превращается в StorageError', async () => {
    const { repo } = fakeRepo(async () => {
      throw new Error('boom');
    });
    const store = createStore(repo, emptyDocument());
    store.update(rename);
    await store.flush();
    expect(store.getSaveError()).toBeInstanceOf(StorageError);
    expect(store.getSaveError()?.code).toBe('unavailable');
  });

  test('отписка', () => {
    const store = createStore(fakeRepo().repo, emptyDocument());
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    unsubscribe();
    store.update(rename);
    expect(calls).toBe(0);
  });
});
