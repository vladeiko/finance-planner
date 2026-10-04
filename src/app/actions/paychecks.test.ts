import { describe, expect, test } from 'vitest';
import type { PlanVersion } from '../../domain/types';
import { account, docWith, paycheckOn, testEnv } from '../testEnv';
import { isPlanVersionUsed } from './plan';
import { addPaycheck, archivePaycheck, type NewPaycheck } from './paychecks';

const plan: PlanVersion = {
  id: 'v1',
  updatedAt: 'old',
  effectiveFrom: '2026-09-01',
  base: 125_000_00,
  items: [{ accountId: 'dog', monthly: 7_000_00 }],
};

const doc = docWith({ accounts: [account('dog', 0), account('piggy', 1)], planVersions: [plan] });

const input: NewPaycheck = {
  date: '2026-09-05',
  kind: 'salary',
  actual: 150_000_00,
  allocations: [{ accountId: 'dog', amount: 3_500_00 }],
  extras: [{ name: ' Кредитка ', amount: 5_000_00 }],
  freeDistribution: [{ accountId: 'piggy', amount: 20_000_00 }],
  note: '  ',
};

describe('addPaycheck', () => {
  test('сохраняет снимок: база и версия плана — на дату получки', () => {
    const { doc: next, id } = addPaycheck(doc, input, testEnv());
    expect(id).toBe('id-1');
    expect(next.paychecks).toEqual([
      {
        id: 'id-1',
        updatedAt: expect.any(String),
        date: '2026-09-05',
        kind: 'salary',
        actual: 150_000_00,
        base: 125_000_00,
        planVersionId: 'v1',
        allocations: [{ accountId: 'dog', amount: 3_500_00 }],
        extras: [{ id: 'id-2', name: 'Кредитка', amount: 5_000_00 }],
        freeDistribution: [{ accountId: 'piggy', amount: 20_000_00 }],
        topUpFromBalancing: 0,
      },
    ]);
  });

  test('версия плана после этого считается использованной; документ не мутируется', () => {
    const { doc: next } = addPaycheck(doc, input, testEnv());
    expect(isPlanVersionUsed(next, 'v1')).toBe(true);
    expect(doc.paychecks).toEqual([]);
  });

  test('непустая заметка сохраняется', () => {
    const { doc: next } = addPaycheck(doc, { ...input, note: ' премия ' }, testEnv());
    expect(next.paychecks[0]!.note).toBe('премия');
  });

  test('нет плана на дату получки — ошибка', () => {
    expect(() => addPaycheck(doc, { ...input, date: '2026-08-31' }, testEnv())).toThrow(
      'Нет плана',
    );
  });

  test('нецелые копейки — ошибка', () => {
    expect(() => addPaycheck(doc, { ...input, actual: 1.5 }, testEnv())).toThrow(RangeError);
  });
});

describe('archivePaycheck', () => {
  const withPaycheck = docWith({ planVersions: [plan], paychecks: [paycheckOn('v1')] });

  test('проставляет deletedAt, версия остаётся занятой', () => {
    const next = archivePaycheck(withPaycheck, 'p-v1', testEnv());
    expect(next.paychecks[0]!.deletedAt).toEqual(expect.any(String));
    expect(isPlanVersionUsed(next, 'v1')).toBe(true);
  });

  test('повторное архивирование ничего не меняет; неизвестная получка — ошибка', () => {
    const once = archivePaycheck(withPaycheck, 'p-v1', testEnv());
    expect(archivePaycheck(once, 'p-v1', testEnv())).toBe(once);
    expect(() => archivePaycheck(withPaycheck, 'nope', testEnv())).toThrow();
  });
});
