import { assertMoney } from './money';
import type { Money } from './types';

export interface PaymentDayInput {
  /** Сколько сейчас на ипотечном счёте. */
  balance: Money;
  /** Текущий обязательный платёж. */
  payment: Money;
  /** Сколько обычно вношу на счёт за месяц. */
  monthly: Money;
}

export interface PaymentDayResult {
  /** Сколько оставить, чтобы к следующему 25-му хватило на платёж. */
  reserve: Money;
  /** Досрочный платёж. */
  prepayment: Money;
  /** Останется на счёте после платежа и досрочки (отрицательно, если не хватает). */
  remaining: Money;
  /** Не хватает на текущий платёж. */
  shortfall: Money;
  /** Будет на счёте к следующему 25-му: останется + вношу в месяц. */
  nextBalance: Money;
  /** К следующему 25-му хватит на платёж. */
  nextCovered: boolean;
}

/** Калькулятор «День платежа» — формулы из spec/product.md, раздел «Ипотека». */
export function paymentDay({ balance, payment, monthly }: PaymentDayInput): PaymentDayResult {
  assertMoney(balance);
  assertMoney(payment);
  assertMoney(monthly);
  const reserve = Math.max(0, payment - monthly);
  const prepayment = Math.max(0, balance - payment - reserve);
  const remaining = balance - payment - prepayment;
  const nextBalance = remaining + monthly;
  return {
    reserve,
    prepayment,
    remaining,
    shortfall: Math.max(0, payment - balance),
    nextBalance,
    nextCovered: nextBalance >= payment,
  };
}
