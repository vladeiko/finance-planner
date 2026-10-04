import { describe, expect, test } from 'vitest';
import { formatAmount, formatMoney, parseMoney } from './money';

const nb = (s: string) => s.replace(/ /g, ' ');

describe('formatMoney', () => {
  test.each([
    [0, '0 ₽'],
    [5_00, '5 ₽'],
    [81_000_00, '81 000 ₽'],
    [125_000_00, '125 000 ₽'],
    [1_234_567_89, '1 234 567,89 ₽'],
    [7_939_01, '7 939,01 ₽'],
    [10, '0,10 ₽'],
    [-9_970_00, '−9 970 ₽'],
  ])('%i → %s', (value, text) => {
    expect(formatMoney(value)).toBe(nb(text));
  });

  test('formatAmount — без знака рубля', () => {
    expect(formatAmount(8_000_50)).toBe(nb('8 000,50'));
  });
});

describe('parseMoney', () => {
  test.each([
    ['125000', 125_000_00],
    ['125 000', 125_000_00],
    [nb('125 000'), 125_000_00],
    ['7939,01', 7_939_01],
    ['7939.5', 7_939_50],
    ['8 000 ₽', 8_000_00],
    ['8000р', 8_000_00],
    ['  0 ', 0],
  ])('%s → %i', (text, value) => {
    expect(parseMoney(text)).toBe(value);
  });

  test.each(['', ' ', 'abc', '-100', '1,234', '10,', ',5', '1.2.3', '9'.repeat(20)])(
    '«%s» — не сумма',
    (text) => {
      expect(parseMoney(text)).toBeUndefined();
    },
  );

  test('формат и разбор сходятся', () => {
    for (const value of [0, 1, 99, 100, 7_939_01, 125_000_00]) {
      expect(parseMoney(formatAmount(value))).toBe(value);
    }
  });
});
