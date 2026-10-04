import { describe, expect, test } from 'vitest';
import { buildAllocations, guessKind, summarize, transfers } from './paycheck';
import type { PlanVersion } from './types';

const rub = (value: number) => value * 100;

/** Исходный план из spec/product.md; Подписки — как в таблице, 8 100. */
const sourcePlan: PlanVersion = {
  id: 'plan',
  updatedAt: '2026-10-04T00:00:00.000Z',
  effectiveFrom: '2026-01-01',
  base: rub(125_000),
  items: [
    { accountId: 'flat', monthly: rub(81_000) },
    { accountId: 'utilities', monthly: rub(8_000) },
    { accountId: 'loan', monthly: rub(5_840) },
    { accountId: 'subs', subitems: [{ id: 's', name: 'Все подписки', monthly: rub(8_100) }] },
    { accountId: 'dog', monthly: rub(7_000) },
    { accountId: 'medicine', monthly: rub(30_000) },
    { accountId: 'fun', monthly: rub(15_000) },
    { accountId: 'reserve', monthly: rub(20_000) },
    { accountId: 'piggy', monthly: rub(15_000) },
  ],
};

describe('guessKind — примеры из спецификации', () => {
  test.each([
    ['2026-03-05', 'salary'],
    ['2026-03-12', 'salary'],
    ['2026-03-13', 'advance'],
    ['2026-03-20', 'advance'],
    ['2026-03-21', 'salary'],
    ['2026-12-26', 'salary'],
  ] as const)('%s → %s', (date, kind) => {
    expect(guessKind(date)).toBe(kind);
  });
});

describe('buildAllocations', () => {
  test('исходный план: доли на получку, итого 94 970', () => {
    const allocations = buildAllocations(sourcePlan, 'salary');
    expect(allocations).toEqual([
      { accountId: 'flat', amount: rub(40_500) },
      { accountId: 'utilities', amount: rub(4_000) },
      { accountId: 'loan', amount: rub(2_920) },
      { accountId: 'subs', amount: rub(4_050) },
      { accountId: 'dog', amount: rub(3_500) },
      { accountId: 'medicine', amount: rub(15_000) },
      { accountId: 'fun', amount: rub(7_500) },
      { accountId: 'reserve', amount: rub(10_000) },
      { accountId: 'piggy', amount: rub(7_500) },
    ]);
    expect(
      summarize({
        actual: rub(125_000),
        base: rub(125_000),
        allocations,
        extras: [],
        freeDistribution: [],
      }).setAside,
    ).toBe(rub(94_970));
  });

  test('составной счёт: сумма подпунктов, лишняя копейка — в зарплату', () => {
    const plan: PlanVersion = {
      ...sourcePlan,
      items: [
        {
          accountId: 'subs',
          subitems: [
            { id: '1', name: 'ChatGPT', monthly: 2_000_00 },
            { id: '2', name: 'VPS', monthly: 1_000_01 },
          ],
        },
      ],
    };
    expect(buildAllocations(plan, 'salary')).toEqual([{ accountId: 'subs', amount: 1_500_01 }]);
    expect(buildAllocations(plan, 'advance')).toEqual([{ accountId: 'subs', amount: 1_500_00 }]);
  });

  test('не мутирует план', () => {
    const copy = structuredClone(sourcePlan);
    buildAllocations(sourcePlan, 'advance');
    expect(sourcePlan).toEqual(copy);
  });
});

describe('summarize — таблица из спецификации (база 125 000, отложено 94 970)', () => {
  const allocations = buildAllocations(sourcePlan, 'salary');

  test.each([
    { actual: 125_000, extra: 0, free: 0, remainder: 30_030, freeLeft: 0 },
    { actual: 150_000, extra: 0, free: 25_000, remainder: 30_030, freeLeft: 25_000 },
    { actual: 150_000, extra: 25_000, free: 25_000, remainder: 30_030, freeLeft: 0 },
    { actual: 150_000, extra: 40_000, free: 25_000, remainder: 15_030, freeLeft: 0 },
    { actual: 125_000, extra: 10_000, free: 0, remainder: 20_030, freeLeft: 0 },
  ])('пришло $actual, экстра $extra', ({ actual, extra, free, remainder, freeLeft }) => {
    const s = summarize({
      actual: rub(actual),
      base: rub(125_000),
      allocations,
      extras: extra ? [{ id: 'e', name: 'Кредитка', amount: rub(extra) }] : [],
      freeDistribution: [],
    });
    expect(s.free).toBe(rub(free));
    expect(s.remainder).toBe(rub(remainder));
    expect(s.freeLeft).toBe(rub(freeLeft));
  });
});

describe('summarize — ручная правка долей, таблица из спецификации', () => {
  const planned = buildAllocations(sourcePlan, 'salary');
  const edit = (changes: Record<string, number>) =>
    planned.map((a) => ({ ...a, amount: rub(changes[a.accountId] ?? a.amount / 100) }));

  test.each<{
    name: string;
    changes: Record<string, number>;
    setAside: number;
    remainder: number;
  }>([
    {
      name: 'Медицина 15 000 → 10 000, НЗ 10 000 → 15 000',
      changes: { medicine: 10_000, reserve: 15_000 },
      setAside: 94_970,
      remainder: 30_030,
    },
    {
      name: 'НЗ 10 000 → 5 000, Копилка 7 500 → 2 500',
      changes: { reserve: 5_000, piggy: 2_500 },
      setAside: 84_970,
      remainder: 40_030,
    },
    {
      name: 'НЗ 10 000 → 20 000',
      changes: { reserve: 20_000 },
      setAside: 104_970,
      remainder: 20_030,
    },
  ])('$name', ({ changes, setAside, remainder }) => {
    const s = summarize({
      actual: rub(125_000),
      base: rub(125_000),
      allocations: edit(changes),
      extras: [],
      freeDistribution: [],
    });
    expect(s.setAside).toBe(rub(setAside));
    expect(s.remainder).toBe(rub(remainder));
  });
});

describe('summarize', () => {
  const allocations = [{ accountId: 'flat', amount: rub(94_970) }];
  const base = rub(125_000);

  test('недобор — подсказка добрать из Балансировки; остаток считается от базы', () => {
    const s = summarize({
      actual: rub(120_000),
      base,
      allocations,
      extras: [],
      freeDistribution: [],
    });
    expect(s.shortfall).toBe(rub(5_000));
    expect(s.free).toBe(0);
    expect(s.remainder).toBe(rub(30_030));
  });

  test('разовые траты складываются и сначала покрывают свободные', () => {
    const s = summarize({
      actual: rub(130_000),
      base,
      allocations,
      extras: [
        { id: '1', name: 'Кредитка', amount: rub(3_000) },
        { id: '2', name: 'Долг', amount: rub(4_000) },
      ],
      freeDistribution: [],
    });
    expect(s.extras).toBe(rub(7_000));
    expect(s.extrasFromFree).toBe(rub(5_000));
    expect(s.extrasFromRemainder).toBe(rub(2_000));
    expect(s.remainder).toBe(rub(28_030));
  });

  test('остаток может быть отрицательным', () => {
    const s = summarize({
      actual: base,
      base,
      allocations,
      extras: [{ id: '1', name: 'Ремонт', amount: rub(40_000) }],
      freeDistribution: [],
    });
    expect(s.remainder).toBe(rub(-9_970));
  });

  test('не распределено = свободные осталось − раскидка', () => {
    const s = summarize({
      actual: rub(150_000),
      base,
      allocations,
      extras: [],
      freeDistribution: [
        { accountId: 'balancing', amount: rub(15_000) },
        { accountId: 'piggy', amount: rub(4_000) },
      ],
    });
    expect(s.freeDistributed).toBe(rub(19_000));
    expect(s.undistributed).toBe(rub(6_000));
  });

  test('раскидано больше свободных — «не распределено» отрицательно', () => {
    const s = summarize({
      actual: rub(130_000),
      base,
      allocations,
      extras: [],
      freeDistribution: [{ accountId: 'piggy', amount: rub(6_000) }],
    });
    expect(s.undistributed).toBe(rub(-1_000));
  });
});

describe('transfers', () => {
  test('доли и раскидка на один счёт складываются; новые счета — в конце', () => {
    expect(
      transfers({
        allocations: [
          { accountId: 'flat', amount: rub(40_500) },
          { accountId: 'piggy', amount: rub(7_500) },
        ],
        freeDistribution: [
          { accountId: 'balancing', amount: rub(15_000) },
          { accountId: 'piggy', amount: rub(4_000) },
        ],
      }),
    ).toEqual([
      { accountId: 'flat', amount: rub(40_500) },
      { accountId: 'piggy', amount: rub(11_500) },
      { accountId: 'balancing', amount: rub(15_000) },
    ]);
  });

  test('нулевые переводы не показываются', () => {
    expect(
      transfers({
        allocations: [
          { accountId: 'flat', amount: rub(40_500) },
          { accountId: 'empty', amount: 0 },
        ],
        freeDistribution: [],
      }),
    ).toEqual([{ accountId: 'flat', amount: rub(40_500) }]);
  });
});
