import { expect, test } from 'vitest';
import { getLocalStorage, readItem, writeItem } from './webStorage';
import { memoryStorage } from './testFixtures';

test('getLocalStorage отдаёт localStorage браузера', () => {
  expect(getLocalStorage()).toBe(globalThis.localStorage);
});

test('getLocalStorage: доступ запрещён — unavailable', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('denied', 'SecurityError');
    },
  });
  try {
    expect(() => getLocalStorage()).toThrow(expect.objectContaining({ code: 'unavailable' }));
  } finally {
    Object.defineProperty(globalThis, 'localStorage', original);
  }
});

test('readItem / writeItem читают и пишут строку', () => {
  const storage = memoryStorage();
  writeItem(storage, 'k', 'v');
  expect(readItem(storage, 'k')).toBe('v');
  expect(readItem(storage, 'missing')).toBeNull();
});
