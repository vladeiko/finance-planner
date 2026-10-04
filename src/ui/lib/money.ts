import type { Money } from '../../domain/types';

const NBSP = ' ';

/** Число с пробелами между разрядами и копейками через запятую, если они есть: «7 939,01». */
export function formatAmount(value: Money): string {
  const abs = Math.abs(value);
  const rubles = String(Math.trunc(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const kopecks = abs % 100;
  const sign = value < 0 ? '−' : '';
  return kopecks === 0
    ? `${sign}${rubles}`
    : `${sign}${rubles},${String(kopecks).padStart(2, '0')}`;
}

/** Сумма для показа: «81 000 ₽», «7 939,01 ₽», «−9 970 ₽». */
export function formatMoney(value: Money): string {
  return `${formatAmount(value)}${NBSP}₽`;
}

/**
 * Разбирает ввод суммы в копейки: «125000», «125 000», «7939,01», «7939.5», «8 000 ₽».
 * Пустая строка, минус, больше двух знаков копеек, мусор — `undefined`.
 */
export function parseMoney(text: string): Money | undefined {
  const cleaned = text
    .replace(/\s/g, '')
    .replace(/(₽|р\.?|руб\.?)$/i, '')
    .replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (match === null) return undefined;
  const kopecks = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(kopecks) ? kopecks : undefined;
}
