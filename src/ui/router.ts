import { useMemo, useSyncExternalStore } from 'react';

/** Путь по умолчанию; станет `/paycheck`, когда появится экран получки. */
export const DEFAULT_PATH = '/plan';

/** «#/plan/abc» → ['plan', 'abc']. */
export function parseHash(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

/** Ссылка для `href`. */
export function href(path: string): string {
  return `#${path}`;
}

/** Переход; `replace` — без новой записи в истории (кнопка «назад» её пропустит). */
export function navigate(path: string, { replace = false } = {}): void {
  if (replace) location.replace(href(path));
  else location.hash = path;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

/** Текущий маршрут сегментами. */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}
