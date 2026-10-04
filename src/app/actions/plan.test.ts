import { describe, expect, test } from 'vitest';
import type { PlanVersion } from '../../domain/types';
import { account, docWith, paycheckOn, testEnv } from '../testEnv';
import {
  addSubitem,
  currentPlanVersion,
  effectiveFromBounds,
  isPlanVersionUsed,
  removeFromPlan,
  removeSubitem,
  setBase,
  setEffectiveFrom,
  setMonthly,
  updateSubitem,
} from './plan';

function v(id: string, effectiveFrom: string, items: PlanVersion['items'] = []): PlanVersion {
  return { id, updatedAt: 'old', effectiveFrom, base: 125_000_00, items };
}

const accounts = [
  account('dog', 0),
  account('reserve', 1),
  account('subs', 2, { kind: 'composite' }),
];

describe('правка плана — примеры из спецификации (сегодня 10.09)', () => {
  test('по текущей версии есть получка → новая версия с сегодняшнего дня', () => {
    const v1 = v('v1', '2026-09-01', [{ accountId: 'dog', monthly: 7_000_00 }]);
    const doc = docWith({ accounts, planVersions: [v1], paychecks: [paycheckOn('v1')] });
    const result = setMonthly(doc, 'dog', 8_000_00, testEnv());
    expect(result.planVersions[0]).toBe(v1);
    expect(result.planVersions[1]).toEqual({
      id: 'id-1',
      updatedAt: expect.any(String),
      effectiveFrom: '2026-09-10',
      base: 125_000_00,
      items: [{ accountId: 'dog', monthly: 8_000_00 }],
    });
  });

  test('по текущей версии получек нет → правится на месте', () => {
    const v1 = v('v1', '2026-09-01');
    const v2 = v('v2', '2026-09-10', [{ accountId: 'reserve', monthly: 20_000_00 }]);
    const doc = docWith({ accounts, planVersions: [v1, v2], paychecks: [paycheckOn('v1')] });
    const result = setMonthly(doc, 'reserve', 25_000_00, testEnv());
    expect(result.planVersions).toHaveLength(2);
    expect(result.planVersions[1]).toMatchObject({
      id: 'v2',
      effectiveFrom: '2026-09-10',
      items: [{ accountId: 'reserve', monthly: 25_000_00 }],
    });
    expect(result.planVersions[1]!.updatedAt).not.toBe('old');
  });

  test('первой версии без получек можно поставить дату задним числом', () => {
    const doc = docWith({ accounts, planVersions: [v('v1', '2026-09-10')] });
    const result = setEffectiveFrom(doc, '2026-09-01', testEnv());
    expect(result.planVersions[0]!.effectiveFrom).toBe('2026-09-01');
  });
});

describe('правка плана', () => {
  test('версий нет → первая с сегодняшнего дня, база 0', () => {
    const result = setMonthly(docWith({ accounts }), 'dog', 7_000_00, testEnv());
    expect(result.planVersions).toEqual([
      {
        id: 'id-1',
        updatedAt: expect.any(String),
        effectiveFrom: '2026-09-10',
        base: 0,
        items: [{ accountId: 'dog', monthly: 7_000_00 }],
      },
    ]);
  });

  test('правка, ничего не меняющая, не создаёт версию', () => {
    const v1 = v('v1', '2026-09-01', [{ accountId: 'dog', monthly: 7_000_00 }]);
    const doc = docWith({ accounts, planVersions: [v1], paychecks: [paycheckOn('v1')] });
    expect(setMonthly(doc, 'dog', 7_000_00, testEnv())).toBe(doc);
    expect(setBase(doc, 125_000_00, testEnv())).toBe(doc);
    const fresh = docWith({ accounts, planVersions: [v1] });
    expect(setMonthly(fresh, 'dog', 7_000_00, testEnv())).toBe(fresh);
  });

  test('будущие версии и архивные не считаются текущими', () => {
    const doc = docWith({
      planVersions: [
        v('v1', '2026-09-01'),
        { ...v('del', '2026-09-05'), deletedAt: 'x' },
        v('future', '2026-10-01'),
      ],
    });
    expect(currentPlanVersion(doc, '2026-09-10')?.id).toBe('v1');
  });

  test('isPlanVersionUsed учитывает и архивные получки', () => {
    const doc = docWith({ paychecks: [{ ...paycheckOn('v1'), deletedAt: 'x' }] });
    expect(isPlanVersionUsed(doc, 'v1')).toBe(true);
    expect(isPlanVersionUsed(doc, 'v2')).toBe(false);
  });

  test('setBase', () => {
    const doc = docWith({ planVersions: [v('v1', '2026-09-01')] });
    expect(setBase(doc, 130_000_00, testEnv()).planVersions[0]!.base).toBe(130_000_00);
  });

  test('setMonthly: новый счёт добавляется в конец, существующий — на своём месте', () => {
    const doc = docWith({
      accounts,
      planVersions: [
        v('v1', '2026-09-01', [
          { accountId: 'dog', monthly: 1 },
          { accountId: 'reserve', monthly: 2 },
        ]),
      ],
    });
    const changed = setMonthly(doc, 'dog', 3, testEnv());
    expect(changed.planVersions[0]!.items.map((i) => i.monthly)).toEqual([3, 2]);
    const added = setMonthly(doc, 'subs', 4, testEnv());
    expect(added.planVersions[0]!.items.at(-1)).toEqual({ accountId: 'subs', monthly: 4 });
  });

  test('removeFromPlan убирает строку счёта', () => {
    const doc = docWith({
      accounts,
      planVersions: [v('v1', '2026-09-01', [{ accountId: 'dog', monthly: 1 }])],
    });
    expect(removeFromPlan(doc, 'dog', testEnv()).planVersions[0]!.items).toEqual([]);
  });

  test('подпункты: добавить, изменить, удалить', () => {
    const env = testEnv();
    let doc = docWith({ accounts, planVersions: [v('v1', '2026-09-01')] });
    doc = addSubitem(doc, 'subs', { name: 'ChatGPT', monthly: 2_000_00 }, env);
    doc = addSubitem(doc, 'subs', { name: 'VPS', monthly: 900_00 }, env);
    expect(doc.planVersions[0]!.items).toEqual([
      {
        accountId: 'subs',
        subitems: [
          { id: 'id-1', name: 'ChatGPT', monthly: 2_000_00 },
          { id: 'id-2', name: 'VPS', monthly: 900_00 },
        ],
      },
    ]);
    doc = updateSubitem(doc, 'subs', 'id-2', { monthly: 1_000_00 }, env);
    doc = removeSubitem(doc, 'subs', 'id-1', env);
    expect(doc.planVersions[0]!.items[0]!.subitems).toEqual([
      { id: 'id-2', name: 'VPS', monthly: 1_000_00 },
    ]);
  });

  test('подпункты при использованной версии → новая версия, старая не тронута', () => {
    const v1 = v('v1', '2026-09-01', [
      { accountId: 'subs', subitems: [{ id: 's', name: 'VPS', monthly: 1 }] },
    ]);
    const doc = docWith({ accounts, planVersions: [v1], paychecks: [paycheckOn('v1')] });
    const result = updateSubitem(doc, 'subs', 's', { monthly: 2 }, testEnv());
    expect(result.planVersions[0]).toBe(v1);
    expect(result.planVersions[1]!.items[0]!.subitems![0]!.monthly).toBe(2);
  });

  test('не мутирует документ', () => {
    const doc = docWith({ accounts, planVersions: [v('v1', '2026-09-01')] });
    const copy = structuredClone(doc);
    setMonthly(doc, 'dog', 1, testEnv());
    addSubitem(doc, 'subs', { name: 'x', monthly: 1 }, testEnv());
    expect(doc).toEqual(copy);
  });
});

describe('дата «действует с»', () => {
  test('у версии с получками менять нельзя', () => {
    const doc = docWith({ planVersions: [v('v1', '2026-09-01')], paychecks: [paycheckOn('v1')] });
    expect(effectiveFromBounds(doc, '2026-09-10')).toBeUndefined();
    expect(() => setEffectiveFrom(doc, '2026-08-01', testEnv())).toThrow();
  });

  test('без версий менять нечего', () => {
    expect(effectiveFromBounds(docWith({}), '2026-09-10')).toBeUndefined();
  });

  test('без предыдущей версии — любая дата не позже сегодня', () => {
    const doc = docWith({ planVersions: [v('v1', '2026-09-10')] });
    expect(effectiveFromBounds(doc, '2026-09-10')).toEqual({ min: undefined, max: '2026-09-10' });
    expect(() => setEffectiveFrom(doc, '2026-09-11', testEnv())).toThrow(RangeError);
  });

  test('строго позже предыдущей версии', () => {
    const doc = docWith({
      planVersions: [v('v1', '2026-09-01'), v('v2', '2026-09-10')],
      paychecks: [paycheckOn('v1')],
    });
    expect(effectiveFromBounds(doc, '2026-09-10')).toEqual({
      min: '2026-09-02',
      max: '2026-09-10',
    });
    expect(() => setEffectiveFrom(doc, '2026-09-01', testEnv())).toThrow(RangeError);
    expect(setEffectiveFrom(doc, '2026-09-02', testEnv()).planVersions[1]!.effectiveFrom).toBe(
      '2026-09-02',
    );
  });

  test('та же дата — документ не меняется', () => {
    const doc = docWith({ planVersions: [v('v1', '2026-09-10')] });
    expect(setEffectiveFrom(doc, '2026-09-10', testEnv())).toBe(doc);
  });
});
