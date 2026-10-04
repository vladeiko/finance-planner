import { describe, expect, test } from 'vitest';
import type { PlanVersion } from '../domain/types';
import { buildPaycheckView, emptyDraft, withDate, withKind, withOverride } from './paycheckDraft';
import { account, docWith } from './testEnv';

const rub = (value: number) => value * 100;

const v1: PlanVersion = {
  id: 'v1',
  updatedAt: 'a',
  effectiveFrom: '2026-01-01',
  base: rub(125_000),
  items: [
    { accountId: 'flat', monthly: rub(81_000) },
    { accountId: 'medicine', monthly: rub(30_000) },
    { accountId: 'reserve', monthly: rub(20_000) },
    { accountId: 'odd', monthly: 1 },
  ],
};
const v2: PlanVersion = { ...v1, id: 'v2', effectiveFrom: '2026-09-01', items: [v1.items[0]!] };

const doc = docWith({
  accounts: [
    account('flat', 0, { name: 'Квартира' }),
    account('medicine', 1, { name: 'Медицина' }),
    account('reserve', 2, { name: 'НЗ' }),
    account('odd', 3, { name: 'Копейка' }),
    account('balance', 4, { name: 'Балансировка', role: 'balancing' }),
    account('old', 5, { name: 'Старый', deletedAt: 'x' }),
  ],
  planVersions: [v1, v2],
});

describe('buildPaycheckView', () => {
  test('по умолчанию: вид по дате, пришло ровно база, доли по плану', () => {
    const view = buildPaycheckView(doc, emptyDraft('2026-03-05'));
    expect(view.version?.id).toBe('v1');
    expect(view.kind).toBe('salary');
    expect(view.actual).toBe(rub(125_000));
    expect(view.rows.map((r) => [r.name, r.amount, r.changed])).toEqual([
      ['Квартира', rub(40_500), false],
      ['Медицина', rub(15_000), false],
      ['НЗ', rub(10_000), false],
      ['Копейка', 1, false],
    ]);
    expect(view.summary).toMatchObject({ setAside: rub(65_500) + 1, free: 0 });
  });

  test('аванс: лишняя копейка уходит в зарплату', () => {
    const salary = buildPaycheckView(doc, emptyDraft('2026-03-05'));
    const advance = buildPaycheckView(doc, emptyDraft('2026-03-20'));
    expect(advance.kind).toBe('advance');
    expect(salary.rows[3]!.amount).toBe(1);
    expect(advance.rows[3]!.amount).toBe(0);
  });

  test('ручная правка меняет отложено и остаток; «вернуть к плану» — undefined', () => {
    const draft = withOverride(emptyDraft('2026-03-05'), 'reserve', rub(20_000));
    const view = buildPaycheckView(doc, draft);
    expect(view.rows[2]).toMatchObject({
      planned: rub(10_000),
      amount: rub(20_000),
      changed: true,
    });
    expect(view.summary!.setAside).toBe(rub(75_500) + 1);
    const back = buildPaycheckView(doc, withOverride(draft, 'reserve', undefined));
    expect(back.rows[2]!.changed).toBe(false);
    expect(back.summary!.setAside).toBe(rub(65_500) + 1);
  });

  test('свободные: раскидка попадает в переводы и «не распределено»', () => {
    const draft = {
      ...emptyDraft('2026-03-05'),
      actual: rub(150_000),
      extras: [{ name: 'Кредитка', amount: rub(5_000) }],
      freeDistribution: [
        { accountId: 'balance', amount: rub(15_000) },
        { accountId: 'reserve', amount: rub(1_000) },
      ],
    };
    const view = buildPaycheckView(doc, draft);
    expect(view.summary).toMatchObject({ free: rub(25_000), freeLeft: rub(20_000) });
    expect(view.summary!.undistributed).toBe(rub(4_000));
    expect(view.transfers.find((t) => t.name === 'НЗ')!.amount).toBe(rub(11_000));
    expect(view.transfers.find((t) => t.name === 'Балансировка')!.amount).toBe(rub(15_000));
    expect(view.input).toMatchObject({ actual: rub(150_000), kind: 'salary' });
    expect(view.freeAccounts.map((a) => a.name)).not.toContain('Старый');
  });

  test('нет плана на дату — без итогов и данных для сохранения', () => {
    const view = buildPaycheckView(doc, emptyDraft('2025-12-31'));
    expect(view.version).toBeUndefined();
    expect(view.summary).toBeUndefined();
    expect(view.input).toBeUndefined();
  });
});

describe('смена даты и вида', () => {
  const edited = withOverride(emptyDraft('2026-03-05'), 'reserve', rub(20_000));

  test('та же версия и вид — правки остаются', () => {
    expect(withDate(doc, edited, '2026-03-07').overrides).toEqual(edited.overrides);
  });

  test('другая версия плана или другой вид — правки сбрасываются', () => {
    expect(withDate(doc, edited, '2026-09-05').overrides).toEqual({});
    expect(withKind(doc, edited, 'advance').overrides).toEqual({});
    expect(withDate(doc, edited, '2026-03-20').overrides).toEqual({});
  });
});
