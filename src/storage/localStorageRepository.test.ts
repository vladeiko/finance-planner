import { describe, expect, test } from 'vitest';
import { StorageError } from './errors';
import { createLocalStorageRepository, DOCUMENT_KEY } from './localStorageRepository';
import { memoryStorage, sampleDocument } from './testFixtures';

describe('localStorageRepository', () => {
  test('пустое хранилище — undefined', async () => {
    await expect(createLocalStorageRepository(memoryStorage()).load()).resolves.toBeUndefined();
  });

  test('сохранённый документ загружается обратно', async () => {
    const repo = createLocalStorageRepository(memoryStorage());
    await repo.save(sampleDocument());
    await expect(repo.load()).resolves.toEqual(sampleDocument());
  });

  test('по умолчанию работает с localStorage браузера', async () => {
    localStorage.clear();
    await createLocalStorageRepository().save(sampleDocument());
    expect(JSON.parse(localStorage.getItem(DOCUMENT_KEY)!)).toEqual(sampleDocument());
    localStorage.clear();
  });

  test('не JSON — invalid', async () => {
    const storage = memoryStorage();
    storage.setItem(DOCUMENT_KEY, '{oops');
    await expect(createLocalStorageRepository(storage).load()).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  test('неверный документ — invalid', async () => {
    const storage = memoryStorage();
    storage.setItem(DOCUMENT_KEY, JSON.stringify({ schemaVersion: 1 }));
    await expect(createLocalStorageRepository(storage).load()).rejects.toBeInstanceOf(StorageError);
  });

  test('переполнение — quota', async () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    await expect(
      createLocalStorageRepository(storage).save(sampleDocument()),
    ).rejects.toMatchObject({
      code: 'quota',
    });
  });

  test('чтение запрещено браузером — unavailable', async () => {
    const storage = memoryStorage();
    storage.getItem = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    await expect(createLocalStorageRepository(storage).load()).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  test('запись запрещена браузером — unavailable', async () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    await expect(
      createLocalStorageRepository(storage).save(sampleDocument()),
    ).rejects.toMatchObject({
      code: 'unavailable',
    });
  });
});
