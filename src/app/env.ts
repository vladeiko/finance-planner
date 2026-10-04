import type { ISODate, ISODateTime } from '../domain/types';

/** Часы и генератор id для actions; в тестах подменяются. */
export interface Env {
  now(): Date;
  newId(): string;
}

export const realEnv: Env = {
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

/** Метка `updatedAt` / `deletedAt`. */
export function timestamp(date: Date): ISODateTime {
  return date.toISOString();
}

/** Сегодняшняя дата по местному времени — «сегодня» пользователя, а не UTC. */
export function localDate(date: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Следующий день после даты. */
export function nextDay(date: ISODate): ISODate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** «Сегодня» пользователя. */
export function today(): ISODate {
  return localDate(realEnv.now());
}
