/**
 * Причина ошибки хранилища — по ней UI выбирает сообщение:
 * - `unavailable` — хранилище недоступно (приватный режим, запрет браузера);
 * - `quota` — не хватило места;
 * - `invalid` — данные битые или не того формата;
 * - `newer-version` — данные от более новой версии приложения.
 */
export type StorageErrorCode = 'unavailable' | 'quota' | 'invalid' | 'newer-version';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
    this.code = code;
  }
}
