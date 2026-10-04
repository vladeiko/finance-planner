import { expect, test } from 'vitest';
import { emptyDocument } from '../storage/document';
import { StorageError } from '../storage/errors';
import type { Repository } from '../storage/repository';
import { boot } from './boot';

function repo(load: Repository['load'], loadRaw: Repository['loadRaw'] = async () => '{raw') {
  const saves: unknown[] = [];
  return {
    repo: { load, loadRaw, save: async (d: unknown) => void saves.push(d) } as Repository,
    saves,
  };
}

test('ничего не сохранено — пустой документ', async () => {
  const result = await boot(repo(async () => undefined).repo);
  expect(result.status).toBe('ready');
  if (result.status === 'ready') expect(result.store.get()).toEqual(emptyDocument());
});

test('загруженный документ попадает в стор', async () => {
  const doc = { ...emptyDocument(), accounts: [] };
  const result = await boot(repo(async () => doc).repo);
  if (result.status !== 'ready') throw new Error('ожидался ready');
  expect(result.store.get()).toBe(doc);
});

test('ошибка загрузки — стор не создаётся, сырые данные отдаются', async () => {
  const { repo: r, saves } = repo(async () => {
    throw new StorageError('newer-version', 'обновите');
  });
  const result = await boot(r);
  expect(result).toEqual({ status: 'failed', error: expect.any(StorageError), raw: '{raw' });
  expect(saves).toEqual([]);
});

test('неожиданная ошибка загрузки и недоступные сырые данные', async () => {
  const result = await boot(
    repo(
      async () => {
        throw new Error('boom');
      },
      async () => {
        throw new Error('nope');
      },
    ).repo,
  );
  expect(result).toMatchObject({ status: 'failed', raw: undefined });
  if (result.status === 'failed') expect(result.error.code).toBe('invalid');
});
