import { assertMoney } from '../../domain/money';
import { activePlanVersion } from '../../domain/plan';
import type { AccountAmount, ISODate, Money, Paycheck, PaycheckKind } from '../../domain/types';
import type { AppDocument } from '../../storage/document';
import { type Env, realEnv, timestamp } from '../env';

export interface NewPaycheck {
  date: ISODate;
  kind: PaycheckKind;
  actual: Money;
  /** Итоговые доли счетов (после ручных правок). */
  allocations: AccountAmount[];
  extras: { name: string; amount: Money }[];
  freeDistribution: AccountAmount[];
  note?: string;
}

function assertAmounts(input: NewPaycheck): void {
  assertMoney(input.actual);
  for (const { amount } of [...input.allocations, ...input.extras, ...input.freeDistribution]) {
    assertMoney(amount);
  }
}

/**
 * Сохраняет получку снимком: база и версия плана берутся на дату получки, суммы — как есть.
 * Нет версии плана на эту дату — ошибка. Возвращает и id получки.
 */
export function addPaycheck(
  doc: AppDocument,
  input: NewPaycheck,
  env: Env = realEnv,
): { doc: AppDocument; id: string } {
  assertAmounts(input);
  const version = activePlanVersion(doc.planVersions, input.date);
  if (version === undefined) throw new Error(`Нет плана на ${input.date}`);
  const note = input.note?.trim();
  const paycheck: Paycheck = {
    id: env.newId(),
    updatedAt: timestamp(env.now()),
    date: input.date,
    kind: input.kind,
    actual: input.actual,
    base: version.base,
    planVersionId: version.id,
    allocations: input.allocations.map(({ accountId, amount }) => ({ accountId, amount })),
    extras: input.extras.map(({ name, amount }) => ({
      id: env.newId(),
      name: name.trim(),
      amount,
    })),
    freeDistribution: input.freeDistribution.map(({ accountId, amount }) => ({
      accountId,
      amount,
    })),
    topUpFromBalancing: 0,
    ...(note ? { note } : {}),
  };
  return { doc: { ...doc, paychecks: [...doc.paychecks, paycheck] }, id: paycheck.id };
}

/** Убирает получку в архив: из истории пропадает, версия плана остаётся «занятой». */
export function archivePaycheck(doc: AppDocument, id: string, env: Env = realEnv): AppDocument {
  const paycheck = doc.paychecks.find((p) => p.id === id);
  if (paycheck === undefined) throw new Error(`Нет получки ${id}`);
  if (paycheck.deletedAt !== undefined) return doc;
  const now = timestamp(env.now());
  return {
    ...doc,
    paychecks: doc.paychecks.map((p) =>
      p.id === id ? { ...p, deletedAt: now, updatedAt: now } : p,
    ),
  };
}
