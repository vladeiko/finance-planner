import type { Account, Paycheck } from '../domain/types';
import type { AppDocument } from '../storage/document';
import { emptyDocument } from '../storage/document';
import type { Env } from './env';

/** Часы на заданный момент (местное время) и предсказуемые id: id-1, id-2, … */
export function testEnv(
  localDateTime = '2026-09-10T12:00:00',
): Env & { setNow(value: string): void } {
  let now = new Date(localDateTime);
  let counter = 0;
  return {
    now: () => now,
    newId: () => `id-${++counter}`,
    setNow(value) {
      now = new Date(value);
    },
  };
}

export function account(id: string, order: number, extra: Partial<Account> = {}): Account {
  return { id, updatedAt: 'old', name: id, kind: 'simple', role: 'regular', order, ...extra };
}

export function docWith(change: Partial<AppDocument>): AppDocument {
  return { ...emptyDocument(), ...change };
}

/** Получка по версии плана — для проверки «по версии есть получки». */
export function paycheckOn(planVersionId: string, date = '2026-09-05'): Paycheck {
  return {
    id: `p-${planVersionId}`,
    updatedAt: 'old',
    date,
    kind: 'salary',
    actual: 0,
    base: 0,
    planVersionId,
    allocations: [],
    extras: [],
    freeDistribution: [],
    topUpFromBalancing: 0,
  };
}
