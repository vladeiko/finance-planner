import type { AppDocument } from '../storage/document';
import { exportDocument, exportFileName, importDocument } from '../storage/exportImport';
import { type Env, localDate, realEnv } from './env';
import type { Action } from './store';

/** Файл бэкапа: имя с сегодняшней датой и содержимое. */
export function backupFile(
  doc: AppDocument,
  env: Env = realEnv,
): { fileName: string; text: string } {
  return { fileName: exportFileName(localDate(env.now())), text: exportDocument(doc) };
}

/** Что лежит в файле бэкапа — для показа перед заменой данных. */
export interface BackupPreview {
  doc: AppDocument;
  accounts: number;
  paychecks: number;
}

/**
 * Проверяет файл бэкапа, ничего не меняя. Ошибка — `StorageError` с понятным текстом;
 * текущие данные при ней остаются как были.
 */
export function readBackup(text: string): BackupPreview {
  const doc = importDocument(text);
  return {
    doc,
    accounts: doc.accounts.filter((a) => a.deletedAt === undefined).length,
    paychecks: doc.paychecks.filter((p) => p.deletedAt === undefined).length,
  };
}

/** Подставляет проверенный документ вместо текущего; сохранит его стор. */
export function replaceDocument(imported: AppDocument): Action {
  return () => imported;
}
