import {
  buildAllocations,
  guessKind,
  summarize,
  transfers,
  type PaycheckSummary,
} from '../domain/paycheck';
import { activePlanVersion } from '../domain/plan';
import type {
  Account,
  AccountAmount,
  ISODate,
  Money,
  PaycheckKind,
  PlanVersion,
} from '../domain/types';
import type { AppDocument } from '../storage/document';
import type { NewPaycheck } from './actions/paychecks';
import { activeAccounts } from './selectors';

/** Черновик получки на экране ввода: только то, что пользователь ввёл сам. */
export interface PaycheckDraft {
  date: ISODate;
  /** `undefined` — вид угадывается по дате. */
  kind: PaycheckKind | undefined;
  /** `undefined` — пришло ровно база. */
  actual: Money | undefined;
  /** Вручную изменённые доли: счёт → сумма. */
  overrides: Record<string, Money>;
  extras: { name: string; amount: Money }[];
  freeDistribution: AccountAmount[];
  note: string;
}

export function emptyDraft(date: ISODate): PaycheckDraft {
  return {
    date,
    kind: undefined,
    actual: undefined,
    overrides: {},
    extras: [],
    freeDistribution: [],
    note: '',
  };
}

export interface AllocationRow {
  accountId: string;
  name: string;
  /** Доля по плану. */
  planned: Money;
  /** Доля с учётом ручной правки. */
  amount: Money;
  changed: boolean;
}

export interface TransferRow {
  accountId: string;
  name: string;
  amount: Money;
}

export interface PaycheckView {
  /** Версия плана на дату получки; без неё сохранить нельзя. */
  version: PlanVersion | undefined;
  kind: PaycheckKind;
  actual: Money;
  rows: AllocationRow[];
  summary: PaycheckSummary | undefined;
  transfers: TransferRow[];
  freeRows: TransferRow[];
  /** Счета, доступные для раскидки свободных. */
  freeAccounts: Account[];
  /** Готовые данные для сохранения; `undefined`, если плана на дату нет. */
  input: NewPaycheck | undefined;
}

function nameOf(doc: AppDocument, accountId: string): string {
  return doc.accounts.find((a) => a.id === accountId)?.name ?? 'Неизвестный счёт';
}

/** Всё, что показывает экран получки: доли с правками, итоги, список переводов. */
export function buildPaycheckView(doc: AppDocument, draft: PaycheckDraft): PaycheckView {
  const version = activePlanVersion(doc.planVersions, draft.date);
  const kind = draft.kind ?? guessKind(draft.date);
  const actual = draft.actual ?? version?.base ?? 0;
  const freeAccounts = activeAccounts(doc);
  const freeRows = draft.freeDistribution.map((d) => ({ ...d, name: nameOf(doc, d.accountId) }));

  if (version === undefined) {
    return {
      version,
      kind,
      actual,
      rows: [],
      summary: undefined,
      transfers: [],
      freeRows,
      freeAccounts,
      input: undefined,
    };
  }

  const rows = buildAllocations(version, kind).map(({ accountId, amount: planned }) => {
    const override = draft.overrides[accountId];
    const amount = override ?? planned;
    return {
      accountId,
      name: nameOf(doc, accountId),
      planned,
      amount,
      changed: amount !== planned,
    };
  });
  const allocations = rows.map(({ accountId, amount }) => ({ accountId, amount }));
  const figures = {
    actual,
    base: version.base,
    allocations,
    extras: draft.extras.map((e, i) => ({ id: String(i), ...e })),
    freeDistribution: draft.freeDistribution,
  };
  return {
    version,
    kind,
    actual,
    rows,
    summary: summarize(figures),
    transfers: transfers(figures).map((t) => ({ ...t, name: nameOf(doc, t.accountId) })),
    freeRows,
    freeAccounts,
    input: {
      date: draft.date,
      kind,
      actual,
      allocations,
      extras: draft.extras,
      freeDistribution: draft.freeDistribution,
      note: draft.note,
    },
  };
}

/** Ручная правка доли счёта; `undefined` — вернуть к плану. */
export function withOverride(
  draft: PaycheckDraft,
  accountId: string,
  amount: Money | undefined,
): PaycheckDraft {
  const { [accountId]: _, ...rest } = draft.overrides;
  return { ...draft, overrides: amount === undefined ? rest : { ...rest, [accountId]: amount } };
}

/** Плановые доли зависят от версии плана и вида; если они сменились, старые правки сбрасываются. */
function resetIfPlannedChanged(
  doc: AppDocument,
  before: PaycheckDraft,
  after: PaycheckDraft,
): PaycheckDraft {
  const sameVersion =
    activePlanVersion(doc.planVersions, before.date)?.id ===
    activePlanVersion(doc.planVersions, after.date)?.id;
  const sameKind =
    (before.kind ?? guessKind(before.date)) === (after.kind ?? guessKind(after.date));
  return sameVersion && sameKind ? after : { ...after, overrides: {} };
}

export function withDate(doc: AppDocument, draft: PaycheckDraft, date: ISODate): PaycheckDraft {
  return resetIfPlannedChanged(doc, draft, { ...draft, date });
}

export function withKind(
  doc: AppDocument,
  draft: PaycheckDraft,
  kind: PaycheckKind,
): PaycheckDraft {
  return resetIfPlannedChanged(doc, draft, { ...draft, kind });
}
