import { describe, expect, test } from 'vitest';
import type { AppDocument } from './document';
import { StorageError } from './errors';
import { sampleDocument } from './testFixtures';
import { validateDocument } from './validate';

/** Ожидает `StorageError('invalid')` с сообщением, содержащим `path`. */
function expectInvalid(doc: unknown, path: string) {
  try {
    validateDocument(doc);
  } catch (error) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe('invalid');
    expect((error as StorageError).message).toContain(path);
    return;
  }
  throw new Error('ожидалась ошибка проверки');
}

function broken(change: (doc: AppDocument) => void): AppDocument {
  const doc = sampleDocument();
  change(doc);
  return doc;
}

describe('validateDocument', () => {
  test('корректный документ возвращается без изменений', () => {
    expect(validateDocument(sampleDocument())).toEqual(sampleDocument());
  });

  test('не мутирует вход и возвращает копию', () => {
    const doc = sampleDocument();
    const result = validateDocument(doc);
    expect(result).not.toBe(doc);
    expect(result.accounts[0]).not.toBe(doc.accounts[0]);
    expect(doc).toEqual(sampleDocument());
  });

  test('неизвестные поля отбрасываются', () => {
    const doc = { ...sampleDocument(), junk: 1 } as unknown as AppDocument;
    (doc.accounts[0] as unknown as Record<string, unknown>).color = 'red';
    const result = validateDocument(doc);
    expect(result).not.toHaveProperty('junk');
    expect(result.accounts[0]).not.toHaveProperty('color');
  });

  test('ссылки на архивный счёт допустимы', () => {
    expect(() => validateDocument(sampleDocument())).not.toThrow();
  });

  test.each([
    ['не объект', () => [] as unknown as AppDocument, 'документ'],
    ['другая версия', () => broken((d) => (d.schemaVersion = 2)), 'schemaVersion'],
    [
      'нет списка получек',
      () => broken((d) => delete (d as Partial<AppDocument>).paychecks),
      'paychecks',
    ],
    [
      'дробные копейки',
      () => broken((d) => (d.paychecks[0]!.actual = 100.5)),
      'paychecks[0].actual',
    ],
    [
      'сумма строкой',
      () => broken((d) => ((d.paychecks[1]!.allocations[0]!.amount as unknown) = '40500')),
      'paychecks[1].allocations[0].amount',
    ],
    [
      'дата с временем',
      () => broken((d) => (d.paychecks[0]!.date = '2026-09-05T00:00')),
      'paychecks[0].date',
    ],
    [
      'неизвестный вид получки',
      () => broken((d) => ((d.paychecks[0]!.kind as string) = 'bonus')),
      'paychecks[0].kind',
    ],
    [
      'неизвестная роль счёта',
      () => broken((d) => ((d.accounts[0]!.role as string) = 'main')),
      'accounts[0].role',
    ],
    ['пустой id', () => broken((d) => (d.accounts[1]!.id = '')), 'accounts[1].id'],
    [
      'дробная сумма подпункта',
      () => broken((d) => (d.planVersions[0]!.items[2]!.subitems![0]!.monthly = 0.1)),
      'planVersions[0].items[2].subitems[0].monthly',
    ],
    [
      'строка плана на несуществующий счёт',
      () => broken((d) => (d.planVersions[0]!.items[0]!.accountId = 'ghost')),
      'planVersions[0].items[0].accountId',
    ],
    [
      'раскидка на несуществующий счёт',
      () => broken((d) => (d.paychecks[0]!.freeDistribution[0]!.accountId = 'ghost')),
      'paychecks[0].freeDistribution[0].accountId',
    ],
    [
      'получка на несуществующую версию плана',
      () => broken((d) => (d.paychecks[1]!.planVersionId = 'ghost')),
      'paychecks[1].planVersionId',
    ],
  ])('%s → ошибка с путём', (_, make, path) => {
    expectInvalid(make(), path);
  });
});
