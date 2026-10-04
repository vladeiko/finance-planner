import { sum } from './money';
import type { ISODate, Money, PlanItem, PlanVersion } from './types';

/**
 * Версия плана, действующая на дату: с максимальным `effectiveFrom <= date`.
 * Архивные версии не учитываются. При одинаковой дате — изменённая позже.
 */
export function activePlanVersion(
  versions: readonly PlanVersion[],
  date: ISODate,
): PlanVersion | undefined {
  let active: PlanVersion | undefined;
  for (const version of versions) {
    if (version.deletedAt !== undefined || version.effectiveFrom > date) continue;
    if (
      active === undefined ||
      version.effectiveFrom > active.effectiveFrom ||
      (version.effectiveFrom === active.effectiveFrom && version.updatedAt > active.updatedAt)
    ) {
      active = version;
    }
  }
  return active;
}

/** Месячная сумма строки плана: для составного счёта — сумма подпунктов. */
export function monthlyOf(item: PlanItem): Money {
  if (item.subitems !== undefined) return sum(item.subitems.map((s) => s.monthly));
  return item.monthly ?? 0;
}
