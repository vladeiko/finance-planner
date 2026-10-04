import { describe, expect, test } from 'vitest';
import { SCHEMA_VERSION } from './document';
import { StorageError } from './errors';
import { migrateDocument, migrations } from './migrations';
import { sampleDocument } from './testFixtures';

function errorOf(value: unknown): StorageError {
  try {
    migrateDocument(value);
  } catch (error) {
    if (error instanceof StorageError) return error;
    throw error;
  }
  throw new Error('ожидалась ошибка');
}

describe('migrateDocument', () => {
  test('документ текущей версии проходит без изменений', () => {
    expect(migrateDocument(sampleDocument())).toEqual(sampleDocument());
  });

  test('для каждой прошлой версии есть миграция', () => {
    for (let v = 1; v < SCHEMA_VERSION; v++) expect(migrations[v]).toBeTypeOf('function');
  });

  test('документ более новой версии — понятная ошибка, а не потеря данных', () => {
    const error = errorOf({ ...sampleDocument(), schemaVersion: SCHEMA_VERSION + 1 });
    expect(error.code).toBe('newer-version');
    expect(error.message).toContain('Обновите приложение');
  });

  test.each([
    ['не объект', 'строка'],
    ['массив', []],
    ['null', null],
    ['без версии', { accounts: [], planVersions: [], paychecks: [] }],
    ['версия 0', { ...sampleDocument(), schemaVersion: 0 }],
    ['версия строкой', { ...sampleDocument(), schemaVersion: '1' }],
  ])('%s → invalid', (_, value) => {
    expect(errorOf(value).code).toBe('invalid');
  });

  test('после миграции документ проверяется', () => {
    const doc = sampleDocument();
    doc.paychecks[0]!.actual = 1.5;
    expect(errorOf(doc).code).toBe('invalid');
  });
});
