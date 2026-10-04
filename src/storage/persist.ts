export type PersistResult = 'granted' | 'denied' | 'unsupported';

/**
 * Просит браузер не вычищать данные сайта при нехватке места.
 * Вызывается при старте; повторный вызов безопасен.
 */
export async function requestPersistence(
  storage: StorageManager | undefined = globalThis.navigator?.storage,
): Promise<PersistResult> {
  if (storage?.persist === undefined) return 'unsupported';
  if (await storage.persisted()) return 'granted';
  return (await storage.persist()) ? 'granted' : 'denied';
}
