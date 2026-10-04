/** Деньги — целые копейки. */
export type Money = number;

/** Дата без времени: `YYYY-MM-DD`. */
export type ISODate = string;

/** Метка времени изменения: ISO-строка с временем. */
export type ISODateTime = string;

/** Поля, общие для всех хранимых сущностей. */
export interface Entity {
  id: string;
  updatedAt: ISODateTime;
  /** Мягкое удаление / архив. */
  deletedAt?: ISODateTime;
}

export type AccountKind = 'simple' | 'composite';
/** `balancing` — счёт, из которого добирают недобор. */
export type AccountRole = 'regular' | 'balancing';

export interface Account extends Entity {
  name: string;
  kind: AccountKind;
  role: AccountRole;
  /** Визуальная группа: «Регулярные», «Накопления». */
  group?: string;
  order: number;
}

export interface PlanSubitem {
  id: string;
  name: string;
  monthly: Money;
}

export interface PlanItem {
  accountId: string;
  /** Для простого счёта. */
  monthly?: Money;
  /** Для составного счёта. */
  subitems?: PlanSubitem[];
}

export interface PlanVersion extends Entity {
  /** Действует с этой даты включительно. */
  effectiveFrom: ISODate;
  base: Money;
  items: PlanItem[];
}

/** Зарплата / аванс. */
export type PaycheckKind = 'salary' | 'advance';

/** Сумма на счёт. */
export interface AccountAmount {
  accountId: string;
  amount: Money;
}

export interface Extra {
  id: string;
  name: string;
  amount: Money;
}

/** Получка — снимок с итоговыми числами. */
export interface Paycheck extends Entity {
  date: ISODate;
  kind: PaycheckKind;
  actual: Money;
  base: Money;
  planVersionId: string;
  allocations: AccountAmount[];
  extras: Extra[];
  freeDistribution: AccountAmount[];
  topUpFromBalancing: Money;
  note?: string;
}
