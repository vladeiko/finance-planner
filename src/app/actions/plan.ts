import { activePlanVersion } from '../../domain/plan';
import type { ISODate, Money, PlanItem, PlanSubitem, PlanVersion } from '../../domain/types';
import type { AppDocument } from '../../storage/document';
import { type Env, localDate, nextDay, realEnv, timestamp } from '../env';

/** Текущая версия плана — действующая на сегодня. */
export function currentPlanVersion(doc: AppDocument, today: ISODate): PlanVersion | undefined {
  return activePlanVersion(doc.planVersions, today);
}

/** По версии есть получки (в т.ч. архивные) — править её нельзя, только создать новую. */
export function isPlanVersionUsed(doc: AppDocument, versionId: string): boolean {
  return doc.paychecks.some((p) => p.planVersionId === versionId);
}

/**
 * Применяет правку к текущей версии плана (spec/product.md, «Изменения плана»):
 * без получек — правится на месте, с получками или без версий — новая версия с сегодняшнего дня.
 * Правка, ничего не меняющая, документ не трогает.
 */
function changeCurrentPlan(
  doc: AppDocument,
  change: (version: PlanVersion) => PlanVersion,
  env: Env,
): AppDocument {
  const now = env.now();
  const today = localDate(now);
  const current = currentPlanVersion(doc, today);

  if (current !== undefined && !isPlanVersionUsed(doc, current.id)) {
    const changed = change(current);
    if (JSON.stringify(changed) === JSON.stringify(current)) return doc;
    const updated = { ...changed, updatedAt: timestamp(now) };
    return {
      ...doc,
      planVersions: doc.planVersions.map((v) => (v.id === current.id ? updated : v)),
    };
  }

  const source: PlanVersion = current ?? {
    id: '',
    updatedAt: '',
    effectiveFrom: today,
    base: 0,
    items: [],
  };
  const changed = change(source);
  if (current !== undefined && JSON.stringify(changed) === JSON.stringify(current)) return doc;
  const created: PlanVersion = {
    ...changed,
    id: env.newId(),
    updatedAt: timestamp(now),
    effectiveFrom: today,
  };
  return { ...doc, planVersions: [...doc.planVersions, created] };
}

function changeItems(version: PlanVersion, change: (items: PlanItem[]) => PlanItem[]): PlanVersion {
  return { ...version, items: change(version.items) };
}

/** Заменяет строку счёта (или добавляет в конец, если её нет). */
function upsertItem(items: PlanItem[], item: PlanItem): PlanItem[] {
  return items.some((i) => i.accountId === item.accountId)
    ? items.map((i) => (i.accountId === item.accountId ? item : i))
    : [...items, item];
}

export function setBase(doc: AppDocument, base: Money, env: Env = realEnv): AppDocument {
  return changeCurrentPlan(doc, (v) => ({ ...v, base }), env);
}

/** Месячная сумма простого счёта; счёт попадает в план, если его там не было. */
export function setMonthly(
  doc: AppDocument,
  accountId: string,
  monthly: Money,
  env: Env = realEnv,
): AppDocument {
  return changeCurrentPlan(
    doc,
    (v) => changeItems(v, (items) => upsertItem(items, { accountId, monthly })),
    env,
  );
}

/** Убирает счёт из плана: он остаётся, но без плановой суммы. */
export function removeFromPlan(
  doc: AppDocument,
  accountId: string,
  env: Env = realEnv,
): AppDocument {
  return changeCurrentPlan(
    doc,
    (v) => changeItems(v, (items) => items.filter((i) => i.accountId !== accountId)),
    env,
  );
}

function changeSubitems(
  doc: AppDocument,
  accountId: string,
  change: (subitems: PlanSubitem[]) => PlanSubitem[],
  env: Env,
): AppDocument {
  return changeCurrentPlan(
    doc,
    (v) =>
      changeItems(v, (items) => {
        const item = items.find((i) => i.accountId === accountId);
        return upsertItem(items, { accountId, subitems: change(item?.subitems ?? []) });
      }),
    env,
  );
}

/** Подпункт составного счёта; счёт попадает в план, если его там не было. */
export function addSubitem(
  doc: AppDocument,
  accountId: string,
  subitem: Omit<PlanSubitem, 'id'>,
  env: Env = realEnv,
): AppDocument {
  const id = env.newId();
  return changeSubitems(doc, accountId, (subitems) => [...subitems, { ...subitem, id }], env);
}

export function updateSubitem(
  doc: AppDocument,
  accountId: string,
  subitemId: string,
  patch: Partial<Omit<PlanSubitem, 'id'>>,
  env: Env = realEnv,
): AppDocument {
  return changeSubitems(
    doc,
    accountId,
    (subitems) => subitems.map((s) => (s.id === subitemId ? { ...s, ...patch } : s)),
    env,
  );
}

export function removeSubitem(
  doc: AppDocument,
  accountId: string,
  subitemId: string,
  env: Env = realEnv,
): AppDocument {
  return changeSubitems(
    doc,
    accountId,
    (subitems) => subitems.filter((s) => s.id !== subitemId),
    env,
  );
}

/** Допустимые даты «действует с» для текущей версии; `undefined` — менять нельзя. */
export interface EffectiveFromBounds {
  /** Самая ранняя дата: день после предыдущей версии; `undefined` — без ограничения. */
  min: ISODate | undefined;
  /** Самая поздняя — сегодня. */
  max: ISODate;
}

export function effectiveFromBounds(
  doc: AppDocument,
  today: ISODate,
): EffectiveFromBounds | undefined {
  const current = currentPlanVersion(doc, today);
  if (current === undefined || isPlanVersionUsed(doc, current.id)) return undefined;
  const previous = doc.planVersions
    .filter(
      (v) =>
        v.id !== current.id &&
        v.deletedAt === undefined &&
        v.effectiveFrom <= current.effectiveFrom,
    )
    .map((v) => v.effectiveFrom)
    .sort()
    .at(-1);
  return { min: previous === undefined ? undefined : nextDay(previous), max: today };
}

/** Меняет дату «действует с» текущей версии без получек. Недопустимая дата — ошибка. */
export function setEffectiveFrom(doc: AppDocument, date: ISODate, env: Env = realEnv): AppDocument {
  const now = env.now();
  const today = localDate(now);
  const bounds = effectiveFromBounds(doc, today);
  if (bounds === undefined) throw new Error('Дату этой версии плана менять нельзя');
  if (date > bounds.max || (bounds.min !== undefined && date < bounds.min)) {
    throw new RangeError(`Дата ${date} вне допустимого диапазона`);
  }
  const current = currentPlanVersion(doc, today)!;
  if (current.effectiveFrom === date) return doc;
  return {
    ...doc,
    planVersions: doc.planVersions.map((v) =>
      v.id === current.id ? { ...v, effectiveFrom: date, updatedAt: timestamp(now) } : v,
    ),
  };
}
