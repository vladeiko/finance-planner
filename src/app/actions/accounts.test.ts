import { describe, expect, test } from 'vitest';
import type { PlanVersion } from '../../domain/types';
import { account, docWith, paycheckOn, testEnv } from '../testEnv';
import {
  archiveAccount,
  createAccount,
  moveAccount,
  restoreAccount,
  updateAccount,
} from './accounts';

const plan = (items: PlanVersion['items']): PlanVersion => ({
  id: 'v1',
  updatedAt: 'old',
  effectiveFrom: '2026-09-01',
  base: 125_000_00,
  items,
});

describe('createAccount', () => {
  test('новый счёт — в конце списка, имя и группа без лишних пробелов', () => {
    const doc = docWith({ accounts: [account('a', 0), account('b', 5, { deletedAt: 'x' })] });
    const { doc: result, id } = createAccount(
      doc,
      { name: ' НЗ ', kind: 'simple', role: 'regular', group: ' Накопления ' },
      testEnv(),
    );
    expect(id).toBe('id-1');
    expect(result.accounts.at(-1)).toEqual({
      id: 'id-1',
      updatedAt: expect.any(String),
      name: 'НЗ',
      kind: 'simple',
      role: 'regular',
      group: 'Накопления',
      order: 6,
    });
  });

  test('пустая группа не сохраняется', () => {
    const { doc } = createAccount(
      docWith({}),
      { name: 'X', kind: 'composite', role: 'balancing', group: '  ' },
      testEnv(),
    );
    expect(doc.accounts[0]).not.toHaveProperty('group');
    expect(doc.accounts[0]!.order).toBe(0);
  });
});

describe('updateAccount', () => {
  test('меняет поля и updatedAt', () => {
    const doc = docWith({ accounts: [account('a', 0, { group: 'G' })] });
    const result = updateAccount(
      doc,
      'a',
      { name: ' Собака ', role: 'balancing', group: '' },
      testEnv(),
    );
    expect(result.accounts[0]).toEqual({
      id: 'a',
      updatedAt: expect.not.stringMatching('old'),
      name: 'Собака',
      kind: 'simple',
      role: 'balancing',
      order: 0,
    });
  });

  test('без изменений — тот же документ', () => {
    const doc = docWith({ accounts: [account('a', 0)] });
    expect(updateAccount(doc, 'a', { name: 'a' }, testEnv())).toBe(doc);
  });

  test('несуществующий счёт — ошибка', () => {
    expect(() => updateAccount(docWith({}), 'ghost', { name: 'x' }, testEnv())).toThrow();
  });
});

describe('moveAccount', () => {
  const doc = docWith({
    accounts: [
      account('a', 0),
      account('archived', 1, { deletedAt: 'x' }),
      account('b', 2),
      account('c', 3),
    ],
  });
  const order = (d: typeof doc) =>
    d.accounts
      .filter((a) => a.deletedAt === undefined)
      .sort((x, y) => x.order - y.order)
      .map((a) => a.id);

  test('меняется местами с соседним неархивным', () => {
    expect(order(moveAccount(doc, 'b', -1, testEnv()))).toEqual(['b', 'a', 'c']);
    expect(order(moveAccount(doc, 'b', 1, testEnv()))).toEqual(['a', 'c', 'b']);
  });

  test('на краю — без изменений', () => {
    expect(moveAccount(doc, 'a', -1, testEnv())).toBe(doc);
    expect(moveAccount(doc, 'c', 1, testEnv())).toBe(doc);
  });
});

describe('archiveAccount / restoreAccount', () => {
  test('архивирование убирает счёт из текущего плана', () => {
    const doc = docWith({
      accounts: [account('a', 0), account('b', 1)],
      planVersions: [
        plan([
          { accountId: 'a', monthly: 1 },
          { accountId: 'b', monthly: 2 },
        ]),
      ],
    });
    const result = archiveAccount(doc, 'a', testEnv());
    expect(result.accounts[0]!.deletedAt).toEqual(expect.any(String));
    expect(result.planVersions[0]!.items).toEqual([{ accountId: 'b', monthly: 2 }]);
  });

  test('если по плану есть получки — новая версия без счёта, старая и получка целы', () => {
    const doc = docWith({
      accounts: [account('a', 0)],
      planVersions: [plan([{ accountId: 'a', monthly: 1 }])],
      paychecks: [paycheckOn('v1')],
    });
    const result = archiveAccount(doc, 'a', testEnv());
    expect(result.planVersions[0]).toBe(doc.planVersions[0]);
    expect(result.planVersions[1]!.items).toEqual([]);
    expect(result.paychecks).toBe(doc.paychecks);
  });

  test('счёт не в плане — план не трогается', () => {
    const doc = docWith({
      accounts: [account('a', 0)],
      planVersions: [plan([])],
      paychecks: [paycheckOn('v1')],
    });
    expect(archiveAccount(doc, 'a', testEnv()).planVersions).toBe(doc.planVersions);
  });

  test('возврат из архива — в конец списка, без плановой суммы', () => {
    const doc = docWith({ accounts: [account('a', 0, { deletedAt: 'x' }), account('b', 1)] });
    const result = restoreAccount(doc, 'a', testEnv());
    expect(result.accounts[0]).not.toHaveProperty('deletedAt');
    expect(result.accounts[0]!.order).toBe(2);
  });

  test('повторные вызовы — без изменений', () => {
    const doc = docWith({ accounts: [account('a', 0)] });
    expect(restoreAccount(doc, 'a', testEnv())).toBe(doc);
    const archived = archiveAccount(doc, 'a', testEnv());
    expect(archiveAccount(archived, 'a', testEnv())).toBe(archived);
  });
});
