import { describe, expect, test } from 'vitest';
import { historyItems, paycheckDetails } from './history';
import { account, docWith, paycheckOn } from './testEnv';

const base = paycheckOn('v1');

describe('historyItems', () => {
  test('по дате, новые сверху; архивные не показываются', () => {
    const doc = docWith({
      paychecks: [
        { ...base, id: 'a', date: '2026-09-05' },
        { ...base, id: 'b', date: '2026-09-20' },
        { ...base, id: 'c', date: '2026-09-25', deletedAt: 'x' },
      ],
    });
    expect(historyItems(doc.paychecks).map((i) => i.paycheck.id)).toEqual(['b', 'a']);
  });
});

describe('paycheckDetails', () => {
  const doc = docWith({
    accounts: [account('dog', 0, { name: 'Собака' }), account('piggy', 1, { name: 'Копилка' })],
    planVersions: [{ id: 'v1', updatedAt: 'a', effectiveFrom: '2026-09-01', base: 0, items: [] }],
    paychecks: [
      {
        ...base,
        actual: 150_000_00,
        base: 125_000_00,
        allocations: [{ accountId: 'dog', amount: 3_500_00 }],
        freeDistribution: [{ accountId: 'dog', amount: 1_000_00 }],
      },
    ],
  });

  test('итоги и переводы с названиями счетов', () => {
    const d = paycheckDetails(doc, base.id)!;
    expect(d.summary).toMatchObject({ free: 25_000_00, setAside: 3_500_00 });
    expect(d.transfers).toEqual([{ accountId: 'dog', name: 'Собака', amount: 4_500_00 }]);
    expect(d.planEffectiveFrom).toBe('2026-09-01');
  });

  test('нет получки — undefined', () => {
    expect(paycheckDetails(doc, 'nope')).toBeUndefined();
  });
});
