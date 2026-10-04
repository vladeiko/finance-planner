import type { Account, Paycheck, PlanVersion } from '../domain/types';

/** Текущая версия формата документа. Меняется только вместе с миграцией. */
export const SCHEMA_VERSION = 1;

/** Всё, что хранит приложение, — один JSON-документ (spec/data-model.md). */
export interface AppDocument {
  schemaVersion: number;
  accounts: Account[];
  planVersions: PlanVersion[];
  paychecks: Paycheck[];
}

export function emptyDocument(): AppDocument {
  return { schemaVersion: SCHEMA_VERSION, accounts: [], planVersions: [], paychecks: [] };
}
