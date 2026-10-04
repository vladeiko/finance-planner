import { expect, test } from 'vitest';
import { requestPersistence } from './persist';

function manager(persisted: boolean, grant: boolean): StorageManager {
  return {
    persisted: async () => persisted,
    persist: async () => grant,
  } as StorageManager;
}

test('без StorageManager — unsupported', async () => {
  await expect(requestPersistence(undefined)).resolves.toBe('unsupported');
  await expect(requestPersistence({} as StorageManager)).resolves.toBe('unsupported');
});

test('уже разрешено — granted без повторного запроса', async () => {
  const m = manager(true, false);
  await expect(requestPersistence(m)).resolves.toBe('granted');
});

test('браузер разрешил — granted', async () => {
  await expect(requestPersistence(manager(false, true))).resolves.toBe('granted');
});

test('браузер отказал — denied', async () => {
  await expect(requestPersistence(manager(false, false))).resolves.toBe('denied');
});
