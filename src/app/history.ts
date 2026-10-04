import { summarize, transfers, type PaycheckSummary } from '../domain/paycheck';
import type { Money, Paycheck } from '../domain/types';
import type { AppDocument } from '../storage/document';
import type { TransferRow } from './paycheckDraft';

export interface HistoryItem {
  paycheck: Paycheck;
  remainder: Money;
}

/** Строки истории: получки без архивных, новые сверху. */
export function historyItems(paychecks: readonly Paycheck[]): HistoryItem[] {
  return paychecks
    .filter((p) => p.deletedAt === undefined)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    .map((paycheck) => ({ paycheck, remainder: summarize(paycheck).remainder }));
}

export interface PaycheckDetails {
  paycheck: Paycheck;
  summary: PaycheckSummary;
  transfers: TransferRow[];
  /** Версия плана, по которой считали (`undefined`, если нет в документе). */
  planEffectiveFrom: string | undefined;
  /** Доли, названия и суммы — как сохранены. */
  allocations: TransferRow[];
  freeRows: TransferRow[];
}

/** Снимок получки для показа; `undefined`, если такой получки нет. */
export function paycheckDetails(doc: AppDocument, id: string): PaycheckDetails | undefined {
  const paycheck = doc.paychecks.find((p) => p.id === id);
  if (paycheck === undefined) return undefined;
  const name = (accountId: string) =>
    doc.accounts.find((a) => a.id === accountId)?.name ?? 'Неизвестный счёт';
  const named = (list: { accountId: string; amount: number }[]): TransferRow[] =>
    list.map((x) => ({ ...x, name: name(x.accountId) }));
  return {
    paycheck,
    summary: summarize(paycheck),
    transfers: named(transfers(paycheck)),
    planEffectiveFrom: doc.planVersions.find((v) => v.id === paycheck.planVersionId)?.effectiveFrom,
    allocations: named(paycheck.allocations),
    freeRows: named(paycheck.freeDistribution),
  };
}
