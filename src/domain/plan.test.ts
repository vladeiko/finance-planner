import { describe, expect, test } from 'vitest';
import { activePlanVersion, monthlyOf } from './plan';
import type { PlanVersion } from './types';

function version(id: string, effectiveFrom: string, extra: Partial<PlanVersion> = {}): PlanVersion {
  return {
    id,
    updatedAt: '2026-10-04T00:00:00.000Z',
    effectiveFrom,
    base: 125_000_00,
    items: [],
    ...extra,
  };
}

describe('activePlanVersion', () => {
  const versions = [version('jan', '2026-01-01'), version('mar', '2026-03-15')];

  test('берёт версию с максимальной датой не позже получки', () => {
    expect(activePlanVersion(versions, '2026-02-20')?.id).toBe('jan');
    expect(activePlanVersion(versions, '2026-04-05')?.id).toBe('mar');
  });

  test('версия действует с даты включительно', () => {
    expect(activePlanVersion(versions, '2026-03-15')?.id).toBe('mar');
    expect(activePlanVersion(versions, '2026-03-14')?.id).toBe('jan');
  });

  test('до первой версии плана нет', () => {
    expect(activePlanVersion(versions, '2025-12-25')).toBeUndefined();
    expect(activePlanVersion([], '2026-03-15')).toBeUndefined();
  });

  test('архивные версии не учитываются', () => {
    const withDeleted = [
      ...versions,
      version('del', '2026-04-01', { deletedAt: '2026-10-04T00:00:00.000Z' }),
    ];
    expect(activePlanVersion(withDeleted, '2026-04-05')?.id).toBe('mar');
  });

  test('при одинаковой дате — изменённая позже', () => {
    const same = [
      version('new', '2026-05-01', { updatedAt: '2026-05-02T10:00:00.000Z' }),
      version('old', '2026-05-01', { updatedAt: '2026-05-01T10:00:00.000Z' }),
    ];
    expect(activePlanVersion(same, '2026-05-05')?.id).toBe('new');
  });
});

describe('monthlyOf', () => {
  test('простой счёт — его месячная сумма', () => {
    expect(monthlyOf({ accountId: 'a', monthly: 8_000_00 })).toBe(8_000_00);
  });

  test('простой счёт без суммы — 0', () => {
    expect(monthlyOf({ accountId: 'a' })).toBe(0);
  });

  test('составной счёт — сумма подпунктов', () => {
    const subscriptions = {
      accountId: 'subs',
      subitems: [
        { id: '1', name: 'ChatGPT', monthly: 2_000_00 },
        { id: '2', name: 'Claude', monthly: 2_000_00 },
        { id: '3', name: 'VPS', monthly: 3_939_00 },
      ],
    };
    expect(monthlyOf(subscriptions)).toBe(7_939_00);
  });
});
