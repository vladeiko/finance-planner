import type { Account, AccountKind, AccountRole } from '../../domain/types';
import type { AppDocument } from '../../storage/document';
import { type Env, localDate, realEnv, timestamp } from '../env';
import { currentPlanVersion, removeFromPlan } from './plan';

export interface NewAccount {
  name: string;
  kind: AccountKind;
  role: AccountRole;
  group?: string;
}

export type AccountPatch = Partial<Pick<Account, 'name' | 'group' | 'role'>>;

function nextOrder(doc: AppDocument): number {
  return Math.max(-1, ...doc.accounts.map((a) => a.order)) + 1;
}

/** Пустая группа = без группы. */
function withGroup<T extends { group?: string }>(value: T): T {
  const group = value.group?.trim();
  const { group: _, ...rest } = value;
  return (group ? { ...rest, group } : rest) as T;
}

function replaceAccount(doc: AppDocument, account: Account): AppDocument {
  return { ...doc, accounts: doc.accounts.map((a) => (a.id === account.id ? account : a)) };
}

function findAccount(doc: AppDocument, id: string): Account {
  const account = doc.accounts.find((a) => a.id === id);
  if (account === undefined) throw new Error(`Нет счёта ${id}`);
  return account;
}

/** Новый счёт — в конце списка, без плановой суммы. Возвращает и его id. */
export function createAccount(
  doc: AppDocument,
  input: NewAccount,
  env: Env = realEnv,
): { doc: AppDocument; id: string } {
  const account: Account = withGroup({
    ...input,
    name: input.name.trim(),
    id: env.newId(),
    updatedAt: timestamp(env.now()),
    order: nextOrder(doc),
  });
  return { doc: { ...doc, accounts: [...doc.accounts, account] }, id: account.id };
}

/** Название, группа, роль. Не версионируются — видны и в старых получках. */
export function updateAccount(
  doc: AppDocument,
  id: string,
  patch: AccountPatch,
  env: Env = realEnv,
): AppDocument {
  const account = findAccount(doc, id);
  const trimmed = patch.name === undefined ? patch : { ...patch, name: patch.name.trim() };
  const changed = withGroup({ ...account, ...trimmed });
  if (JSON.stringify(changed) === JSON.stringify(account)) return doc;
  return replaceAccount(doc, { ...changed, updatedAt: timestamp(env.now()) });
}

/** Меняет местами счёт с соседним среди неархивных: -1 — выше, 1 — ниже. */
export function moveAccount(
  doc: AppDocument,
  id: string,
  direction: -1 | 1,
  env: Env = realEnv,
): AppDocument {
  const active = doc.accounts
    .filter((a) => a.deletedAt === undefined)
    .sort((a, b) => a.order - b.order);
  const index = active.findIndex((a) => a.id === id);
  const neighbour = active[index + direction];
  const account = active[index];
  if (account === undefined || neighbour === undefined) return doc;
  const updatedAt = timestamp(env.now());
  return replaceAccount(replaceAccount(doc, { ...account, order: neighbour.order, updatedAt }), {
    ...neighbour,
    order: account.order,
    updatedAt,
  });
}

/** Архивирует счёт и убирает его из текущего плана (по правилам версий). */
export function archiveAccount(doc: AppDocument, id: string, env: Env = realEnv): AppDocument {
  const account = findAccount(doc, id);
  if (account.deletedAt !== undefined) return doc;
  const now = timestamp(env.now());
  const archived = replaceAccount(doc, { ...account, deletedAt: now, updatedAt: now });
  const inPlan = currentPlanVersion(doc, localDate(env.now()))?.items.some(
    (i) => i.accountId === id,
  );
  return inPlan ? removeFromPlan(archived, id, env) : archived;
}

/** Возвращает счёт из архива — в конец списка, без плановой суммы. */
export function restoreAccount(doc: AppDocument, id: string, env: Env = realEnv): AppDocument {
  const account = findAccount(doc, id);
  if (account.deletedAt === undefined) return doc;
  const { deletedAt: _, ...rest } = account;
  return replaceAccount(doc, { ...rest, order: nextOrder(doc), updatedAt: timestamp(env.now()) });
}
