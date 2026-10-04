import type { ISODate } from '../domain/types';
import type { AppDocument } from './document';
import { StorageError } from './errors';
import { migrateDocument } from './migrations';

/** JSON для бэкапа: читаемый человеком, тот же формат, что и в хранилище. */
export function exportDocument(doc: AppDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function exportFileName(today: ISODate): string {
  return `finance-planner-${today}.json`;
}

/**
 * Разбирает файл бэкапа: JSON → миграция до текущей версии → проверка.
 * Ничего не сохраняет — при ошибке текущие данные остаются как были.
 */
export function importDocument(text: string): AppDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new StorageError('invalid', 'Файл не похож на бэкап: это не JSON.', { cause });
  }
  return migrateDocument(parsed);
}
