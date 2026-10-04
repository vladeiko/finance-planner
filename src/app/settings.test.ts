import { describe, expect, test } from 'vitest';
import { emptyDocument } from '../storage/document';
import { StorageError } from '../storage/errors';
import { account, docWith, testEnv } from './testEnv';
import { backupFile, readBackup, replaceDocument } from './settings';

describe('backupFile', () => {
  test('имя по сегодняшней дате, содержимое читается обратно', () => {
    const doc = emptyDocument();
    const { fileName, text } = backupFile(doc, testEnv('2026-10-04T12:00:00'));
    expect(fileName).toBe('finance-planner-2026-10-04.json');
    expect(readBackup(text).doc).toEqual(doc);
  });
});

describe('readBackup', () => {
  test('считает неархивные счета и получки', () => {
    const doc = docWith({
      accounts: [account('a', 1), account('b', 2, { deletedAt: '2026-09-01T00:00:00.000Z' })],
    });
    expect(readBackup(JSON.stringify(doc))).toMatchObject({ accounts: 1, paychecks: 0 });
  });

  test('не JSON и битый документ — StorageError', () => {
    expect(() => readBackup('{oops')).toThrow(StorageError);
    expect(() => readBackup('{"schemaVersion":1}')).toThrow(StorageError);
  });
});

test('replaceDocument подставляет документ целиком', () => {
  const imported = emptyDocument();
  expect(replaceDocument(imported)(docWith({ accounts: [account('a', 1)] }))).toBe(imported);
});
