import type { ISODate } from '../../domain/types';

/** «2026-09-01» → «01.09.2026». */
export function formatDate(date: ISODate): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}
