import { splitMonthly } from '../domain/money';
import { buildAllocations, summarize } from '../domain/paycheck';
import { monthlyOf } from '../domain/plan';
import type { Account, ISODate, Money, PaycheckKind, PlanVersion } from '../domain/types';
import type { AppDocument } from '../storage/document';
import {
  currentPlanVersion,
  type EffectiveFromBounds,
  effectiveFromBounds,
  isPlanVersionUsed,
} from './actions/plan';

const byOrder = (a: Account, b: Account) => a.order - b.order;

export function activeAccounts(doc: AppDocument): Account[] {
  return doc.accounts.filter((a) => a.deletedAt === undefined).sort(byOrder);
}

export function archivedAccounts(doc: AppDocument): Account[] {
  return doc.accounts.filter((a) => a.deletedAt !== undefined).sort(byOrder);
}

/** Названия групп счетов — для подсказки при вводе. */
export function accountGroups(doc: AppDocument): string[] {
  return [...new Set(doc.accounts.flatMap((a) => (a.group ? [a.group] : [])))].sort();
}

/** Сумма на получку для зарплаты и аванса (различаются максимум на копейку). */
export interface PerPaycheck {
  salary: Money;
  advance: Money;
}

function perPaycheck(fn: (kind: PaycheckKind) => Money): PerPaycheck {
  return { salary: fn('salary'), advance: fn('advance') };
}

export interface PlanRow {
  account: Account;
  /** `undefined` — счёт без плановой суммы. */
  monthly: Money | undefined;
  share: PerPaycheck | undefined;
}

export interface PlanOverview {
  version: PlanVersion | undefined;
  /** По версии есть получки — правка создаст новую версию с сегодняшнего дня. */
  versionUsed: boolean;
  effectiveFromBounds: EffectiveFromBounds | undefined;
  rows: PlanRow[];
  setAside: PerPaycheck;
  remainder: PerPaycheck;
}

/** Всё для экрана плана: строки счетов, отложено и остаток на получку. */
export function planOverview(doc: AppDocument, today: ISODate): PlanOverview {
  const version = currentPlanVersion(doc, today);
  const rows = activeAccounts(doc).map((account): PlanRow => {
    const item = version?.items.find((i) => i.accountId === account.id);
    if (item === undefined) return { account, monthly: undefined, share: undefined };
    const monthly = monthlyOf(item);
    return { account, monthly, share: perPaycheck((kind) => splitMonthly(monthly, kind)) };
  });
  const summary = (kind: PaycheckKind) =>
    version === undefined
      ? { setAside: 0, remainder: 0 }
      : summarize({
          actual: version.base,
          base: version.base,
          allocations: buildAllocations(version, kind),
          extras: [],
          freeDistribution: [],
        });
  return {
    version,
    versionUsed: version !== undefined && isPlanVersionUsed(doc, version.id),
    effectiveFromBounds: effectiveFromBounds(doc, today),
    rows,
    setAside: perPaycheck((kind) => summary(kind).setAside),
    remainder: perPaycheck((kind) => summary(kind).remainder),
  };
}
