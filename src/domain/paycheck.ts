import { assertMoney, splitMonthly, sum } from './money';
import { monthlyOf } from './plan';
import type { AccountAmount, ISODate, Money, Paycheck, PaycheckKind, PlanVersion } from './types';

/** Вид получки по умолчанию по дню месяца: 13–20 — аванс, иначе зарплата. */
export function guessKind(date: ISODate): PaycheckKind {
  const day = Number(date.slice(8, 10));
  return day >= 13 && day <= 20 ? 'advance' : 'salary';
}

/** Доли счетов на получку по версии плана, в порядке строк плана. */
export function buildAllocations(plan: PlanVersion, kind: PaycheckKind): AccountAmount[] {
  return plan.items.map((item) => ({
    accountId: item.accountId,
    amount: splitMonthly(monthlyOf(item), kind),
  }));
}

export type PaycheckFigures = Pick<
  Paycheck,
  'actual' | 'base' | 'allocations' | 'extras' | 'freeDistribution'
>;

export interface PaycheckSummary {
  /** Пришло сверх базы. */
  free: Money;
  /** Не хватает до базы — подсказка «добрать из Балансировки». */
  shortfall: Money;
  /** Сумма долей счетов. */
  setAside: Money;
  /** Сумма разовых трат. */
  extras: Money;
  extrasFromFree: Money;
  extrasFromRemainder: Money;
  /** На еду и прочее; может быть отрицательным. */
  remainder: Money;
  /** Свободные после разовых трат. */
  freeLeft: Money;
  /** Раскидано из свободных по счетам. */
  freeDistributed: Money;
  /** Свободные, которые ещё не раскиданы; отрицательно, если раскидано больше. */
  undistributed: Money;
}

/** Производные числа получки — формулы из spec/product.md, «Свободные деньги, недобор…». */
export function summarize(p: PaycheckFigures): PaycheckSummary {
  assertMoney(p.actual);
  assertMoney(p.base);
  const free = Math.max(0, p.actual - p.base);
  const shortfall = Math.max(0, p.base - p.actual);
  const setAside = sum(p.allocations.map((a) => a.amount));
  const extras = sum(p.extras.map((e) => e.amount));
  const extrasFromFree = Math.min(extras, free);
  const extrasFromRemainder = extras - extrasFromFree;
  const remainder = p.base - setAside - extrasFromRemainder;
  const freeLeft = free - extrasFromFree;
  const freeDistributed = sum(p.freeDistribution.map((d) => d.amount));
  return {
    free,
    shortfall,
    setAside,
    extras,
    extrasFromFree,
    extrasFromRemainder,
    remainder,
    freeLeft,
    freeDistributed,
    undistributed: freeLeft - freeDistributed,
  };
}

/**
 * Список переводов: доли по плану + раскидка свободных.
 * Суммы на один счёт складываются; порядок — по первому появлению счёта;
 * нулевые переводы не показываются.
 */
export function transfers(p: Pick<Paycheck, 'allocations' | 'freeDistribution'>): AccountAmount[] {
  const totals = new Map<string, Money>();
  for (const { accountId, amount } of [...p.allocations, ...p.freeDistribution]) {
    assertMoney(amount);
    totals.set(accountId, (totals.get(accountId) ?? 0) + amount);
  }
  return [...totals]
    .filter(([, amount]) => amount !== 0)
    .map(([accountId, amount]) => ({ accountId, amount }));
}
