import type { Money, PaycheckKind } from './types';

/** Проверяет, что сумма — целое число копеек. */
export function assertMoney(value: Money): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Сумма должна быть целым числом копеек: ${value}`);
  }
}

/** Сумма списка. */
export function sum(values: readonly Money[]): Money {
  let total = 0;
  for (const value of values) {
    assertMoney(value);
    total += value;
  }
  return total;
}

/**
 * Доля месячной суммы на одну получку: половина.
 * Если месячная сумма нечётная, лишняя копейка уходит в зарплату —
 * за месяц зарплата + аванс сходятся до копейки.
 */
export function splitMonthly(monthly: Money, kind: PaycheckKind): Money {
  assertMoney(monthly);
  const half = Math.floor(monthly / 2);
  return kind === 'salary' ? monthly - half : half;
}
