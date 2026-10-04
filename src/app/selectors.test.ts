import { describe, expect, test } from 'vitest';
import { accountGroups, activeAccounts, archivedAccounts, planOverview } from './selectors';
import { account, docWith, paycheckOn } from './testEnv';

const accounts = [
  account('flat', 1, { group: 'Регулярные' }),
  account('subs', 0, { kind: 'composite', group: 'Регулярные' }),
  account('balancing', 2, { role: 'balancing' }),
  account('old', 3, { deletedAt: 'x', group: 'Архив' }),
];

test('активные и архивные счета — по порядку', () => {
  const doc = docWith({ accounts });
  expect(activeAccounts(doc).map((a) => a.id)).toEqual(['subs', 'flat', 'balancing']);
  expect(archivedAccounts(doc).map((a) => a.id)).toEqual(['old']);
});

test('группы — без повторов, по алфавиту', () => {
  expect(accountGroups(docWith({ accounts }))).toEqual(['Архив', 'Регулярные']);
});

describe('planOverview', () => {
  const doc = docWith({
    accounts,
    planVersions: [
      {
        id: 'v1',
        updatedAt: 'old',
        effectiveFrom: '2026-09-01',
        base: 125_000_00,
        items: [
          { accountId: 'flat', monthly: 81_000_00 },
          {
            accountId: 'subs',
            subitems: [
              { id: '1', name: 'ChatGPT', monthly: 2_000_00 },
              { id: '2', name: 'VPS', monthly: 1_000_01 },
            ],
          },
        ],
      },
    ],
  });

  test('строки: суммы в месяц и на получку, счёт без суммы', () => {
    const { rows } = planOverview(doc, '2026-09-10');
    expect(rows.map((r) => [r.account.id, r.monthly, r.share])).toEqual([
      ['subs', 3_000_01, { salary: 1_500_01, advance: 1_500_00 }],
      ['flat', 81_000_00, { salary: 40_500_00, advance: 40_500_00 }],
      ['balancing', undefined, undefined],
    ]);
  });

  test('отложено и остаток на получку', () => {
    const o = planOverview(doc, '2026-09-10');
    expect(o.setAside).toEqual({ salary: 42_000_01, advance: 42_000_00 });
    expect(o.remainder).toEqual({ salary: 82_999_99, advance: 83_000_00 });
    expect(o.versionUsed).toBe(false);
    expect(o.effectiveFromBounds).toEqual({ min: undefined, max: '2026-09-10' });
  });

  test('версия с получками помечена', () => {
    const used = { ...doc, paychecks: [paycheckOn('v1')] };
    const o = planOverview(used, '2026-09-10');
    expect(o.versionUsed).toBe(true);
    expect(o.effectiveFromBounds).toBeUndefined();
  });

  test('плана нет — нули, все счета без суммы', () => {
    const o = planOverview(docWith({ accounts }), '2026-09-10');
    expect(o.version).toBeUndefined();
    expect(o.setAside).toEqual({ salary: 0, advance: 0 });
    expect(o.rows.every((r) => r.monthly === undefined)).toBe(true);
  });
});
