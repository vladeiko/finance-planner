import { type AppDocument, SCHEMA_VERSION } from './document';
import { StorageError } from './errors';
import { validateDocument } from './validate';

type RawDocument = Record<string, unknown>;

/**
 * Миграции формата: ключ N — функция, переводящая документ версии N в N+1.
 * Чистые, без потери данных. Пока версия одна — миграций нет.
 */
export const migrations: Record<number, (doc: RawDocument) => RawDocument> = {};

/**
 * Приводит документ любой поддерживаемой версии к текущей и проверяет его.
 * Через неё проходят и загрузка, и импорт.
 */
export function migrateDocument(value: unknown): AppDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new StorageError('invalid', 'документ: ожидается объект');
  }
  let doc = value as RawDocument;
  const version = doc.schemaVersion;
  if (!Number.isSafeInteger(version) || (version as number) < 1) {
    throw new StorageError('invalid', 'schemaVersion: ожидается целое число от 1');
  }
  if ((version as number) > SCHEMA_VERSION) {
    throw new StorageError(
      'newer-version',
      `Данные от более новой версии приложения (формат ${String(version)}, поддерживается до ${SCHEMA_VERSION}). Обновите приложение.`,
    );
  }
  for (let v = version as number; v < SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate === undefined) throw new Error(`Нет миграции формата ${v} → ${v + 1}`);
    doc = { ...migrate(doc), schemaVersion: v + 1 };
  }
  return validateDocument(doc);
}
