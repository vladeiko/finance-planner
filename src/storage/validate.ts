import type {
  Account,
  AccountAmount,
  Extra,
  Paycheck,
  PlanItem,
  PlanSubitem,
  PlanVersion,
} from '../domain/types';
import { type AppDocument, SCHEMA_VERSION } from './document';
import { StorageError } from './errors';

type Obj = Record<string, unknown>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(path: string, expected: string): never {
  throw new StorageError('invalid', `${path}: ожидается ${expected}`);
}

function obj(value: unknown, path: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'объект');
  return value as Obj;
}

function arr<T>(value: unknown, path: string, item: (v: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) fail(path, 'массив');
  return value.map((v, i) => item(v, `${path}[${i}]`));
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'строка');
  return value;
}

function nonEmpty(value: unknown, path: string): string {
  if (str(value, path) === '') fail(path, 'непустая строка');
  return value as string;
}

function optStr(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : str(value, path);
}

function date(value: unknown, path: string): string {
  if (!DATE_RE.test(str(value, path))) fail(path, 'дата YYYY-MM-DD');
  return value as string;
}

function money(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) fail(path, 'сумма в целых копейках');
  return value as number;
}

function oneOf<T extends string>(value: unknown, path: string, options: readonly T[]): T {
  if (!options.includes(value as T)) fail(path, `одно из: ${options.join(', ')}`);
  return value as T;
}

/** Общие поля сущности; `deletedAt` переносится, только если задан. */
function entity(o: Obj, path: string) {
  const deletedAt = optStr(o.deletedAt, `${path}.deletedAt`);
  return {
    id: nonEmpty(o.id, `${path}.id`),
    updatedAt: nonEmpty(o.updatedAt, `${path}.updatedAt`),
    ...(deletedAt !== undefined && { deletedAt }),
  };
}

function account(value: unknown, path: string): Account {
  const o = obj(value, path);
  const group = optStr(o.group, `${path}.group`);
  if (typeof o.order !== 'number' || !Number.isFinite(o.order)) fail(`${path}.order`, 'число');
  return {
    ...entity(o, path),
    name: str(o.name, `${path}.name`),
    kind: oneOf(o.kind, `${path}.kind`, ['simple', 'composite']),
    role: oneOf(o.role, `${path}.role`, ['regular', 'balancing']),
    ...(group !== undefined && { group }),
    order: o.order,
  };
}

function subitem(value: unknown, path: string): PlanSubitem {
  const o = obj(value, path);
  return {
    id: nonEmpty(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    monthly: money(o.monthly, `${path}.monthly`),
  };
}

function planItem(value: unknown, path: string): PlanItem {
  const o = obj(value, path);
  return {
    accountId: nonEmpty(o.accountId, `${path}.accountId`),
    ...(o.monthly !== undefined && { monthly: money(o.monthly, `${path}.monthly`) }),
    ...(o.subitems !== undefined && { subitems: arr(o.subitems, `${path}.subitems`, subitem) }),
  };
}

function planVersion(value: unknown, path: string): PlanVersion {
  const o = obj(value, path);
  return {
    ...entity(o, path),
    effectiveFrom: date(o.effectiveFrom, `${path}.effectiveFrom`),
    base: money(o.base, `${path}.base`),
    items: arr(o.items, `${path}.items`, planItem),
  };
}

function accountAmount(value: unknown, path: string): AccountAmount {
  const o = obj(value, path);
  return {
    accountId: nonEmpty(o.accountId, `${path}.accountId`),
    amount: money(o.amount, `${path}.amount`),
  };
}

function extra(value: unknown, path: string): Extra {
  const o = obj(value, path);
  return {
    id: nonEmpty(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    amount: money(o.amount, `${path}.amount`),
  };
}

function paycheck(value: unknown, path: string): Paycheck {
  const o = obj(value, path);
  const note = optStr(o.note, `${path}.note`);
  return {
    ...entity(o, path),
    date: date(o.date, `${path}.date`),
    kind: oneOf(o.kind, `${path}.kind`, ['salary', 'advance']),
    actual: money(o.actual, `${path}.actual`),
    base: money(o.base, `${path}.base`),
    planVersionId: nonEmpty(o.planVersionId, `${path}.planVersionId`),
    allocations: arr(o.allocations, `${path}.allocations`, accountAmount),
    extras: arr(o.extras, `${path}.extras`, extra),
    freeDistribution: arr(o.freeDistribution, `${path}.freeDistribution`, accountAmount),
    topUpFromBalancing: money(o.topUpFromBalancing, `${path}.topUpFromBalancing`),
    ...(note !== undefined && { note }),
  };
}

/** Ссылки на счета и версии плана должны указывать на существующие записи (в т.ч. архивные). */
function checkReferences(doc: AppDocument): void {
  const accountIds = new Set(doc.accounts.map((a) => a.id));
  const planIds = new Set(doc.planVersions.map((v) => v.id));
  const checkAccount = (id: string, path: string) => {
    if (!accountIds.has(id)) fail(path, `ссылка на существующий счёт (нет «${id}»)`);
  };
  doc.planVersions.forEach((v, i) =>
    v.items.forEach((item, j) =>
      checkAccount(item.accountId, `planVersions[${i}].items[${j}].accountId`),
    ),
  );
  doc.paychecks.forEach((p, i) => {
    const path = `paychecks[${i}]`;
    if (!planIds.has(p.planVersionId)) {
      fail(
        `${path}.planVersionId`,
        `ссылка на существующую версию плана (нет «${p.planVersionId}»)`,
      );
    }
    p.allocations.forEach((a, j) =>
      checkAccount(a.accountId, `${path}.allocations[${j}].accountId`),
    );
    p.freeDistribution.forEach((a, j) =>
      checkAccount(a.accountId, `${path}.freeDistribution[${j}].accountId`),
    );
  });
}

/**
 * Проверяет документ текущей версии и возвращает его копию только с известными полями.
 * Бросает `StorageError('invalid')` с путём до первого неверного поля.
 */
export function validateDocument(value: unknown): AppDocument {
  const o = obj(value, 'документ');
  if (o.schemaVersion !== SCHEMA_VERSION) fail('schemaVersion', String(SCHEMA_VERSION));
  const doc: AppDocument = {
    schemaVersion: SCHEMA_VERSION,
    accounts: arr(o.accounts, 'accounts', account),
    planVersions: arr(o.planVersions, 'planVersions', planVersion),
    paychecks: arr(o.paychecks, 'paychecks', paycheck),
  };
  checkReferences(doc);
  return doc;
}
