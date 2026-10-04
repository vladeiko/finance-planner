import { paymentDay, type PaymentDayResult } from '../domain/mortgage';
import type { Money } from '../domain/types';
import { loadMortgagePrefs, saveMortgagePrefs } from '../storage/prefs';

/** Поля калькулятора; `undefined` — ещё не введено. */
export interface MortgageInputs {
  balance: Money | undefined;
  payment: Money | undefined;
  monthly: Money | undefined;
}

/**
 * Последние введённые значения для подстановки. Это лишь подсказка:
 * недоступное или битое хранилище равносильно пустым полям, ошибка не показывается.
 */
export function loadMortgageInputs(): MortgageInputs {
  try {
    const prefs = loadMortgagePrefs();
    return { balance: prefs?.balance, payment: prefs?.payment, monthly: prefs?.monthly };
  } catch {
    return { balance: undefined, payment: undefined, monthly: undefined };
  }
}

/** Запоминает значения, когда введены все три; сбой хранилища не мешает расчёту. */
export function saveMortgageInputs({ balance, payment, monthly }: MortgageInputs): void {
  if (balance === undefined || payment === undefined || monthly === undefined) return;
  try {
    saveMortgagePrefs({ balance, payment, monthly });
  } catch {
    // Подсказка не критична.
  }
}

/** Результат «Дня платежа»; `undefined`, пока введены не все поля. */
export function calculatePaymentDay({
  balance,
  payment,
  monthly,
}: MortgageInputs): PaymentDayResult | undefined {
  if (balance === undefined || payment === undefined || monthly === undefined) return undefined;
  return paymentDay({ balance, payment, monthly });
}
