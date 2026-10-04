import type { Money } from '../domain/types';
import { getLocalStorage, readItem, writeItem } from './webStorage';

export const MORTGAGE_PREFS_KEY = 'finance-planner:prefs:mortgage';

/** Последние значения калькулятора ипотеки — только для подстановки, вне документа. */
export interface MortgagePrefs {
  balance: Money;
  payment: Money;
  monthly: Money;
}

const isMoney = (value: unknown): value is Money => Number.isSafeInteger(value);

/**
 * Последние значения или `undefined`, если их нет или они битые:
 * это лишь подсказка, из-за неё не стоит показывать ошибку.
 * Недоступное хранилище — `StorageError`.
 */
export function loadMortgagePrefs(storage: Storage = getLocalStorage()): MortgagePrefs | undefined {
  const raw = readItem(storage, MORTGAGE_PREFS_KEY);
  if (raw === null) return undefined;
  try {
    const { balance, payment, monthly } = JSON.parse(raw) as Partial<MortgagePrefs>;
    if (isMoney(balance) && isMoney(payment) && isMoney(monthly)) {
      return { balance, payment, monthly };
    }
  } catch {
    // Битая подсказка равносильна её отсутствию.
  }
  return undefined;
}

export function saveMortgagePrefs(
  prefs: MortgagePrefs,
  storage: Storage = getLocalStorage(),
): void {
  writeItem(storage, MORTGAGE_PREFS_KEY, JSON.stringify(prefs));
}
