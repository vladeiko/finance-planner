import { describe, expect, test } from 'vitest';
import { assertMoney, splitMonthly, sum } from './money';

describe('assertMoney', () => {
  test('целые копейки проходят', () => {
    expect(() => assertMoney(0)).not.toThrow();
    expect(() => assertMoney(-150)).not.toThrow();
  });

  test('дробные и нечисловые суммы отвергаются', () => {
    expect(() => assertMoney(10.5)).toThrow(RangeError);
    expect(() => assertMoney(Number.NaN)).toThrow(RangeError);
    expect(() => assertMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe('sum', () => {
  test('складывает копейки', () => {
    expect(sum([])).toBe(0);
    expect(sum([100, 250, -50])).toBe(300);
  });

  test('дробная сумма в списке — ошибка', () => {
    expect(() => sum([100, 0.1])).toThrow(RangeError);
  });
});

describe('splitMonthly', () => {
  test('чётная сумма делится поровну', () => {
    expect(splitMonthly(8_000_00, 'salary')).toBe(4_000_00);
    expect(splitMonthly(8_000_00, 'advance')).toBe(4_000_00);
  });

  test('лишняя копейка уходит в зарплату', () => {
    expect(splitMonthly(7_939_01, 'salary')).toBe(3_969_51);
    expect(splitMonthly(7_939_01, 'advance')).toBe(3_969_50);
  });

  test('за месяц зарплата + аванс сходятся до копейки', () => {
    for (const monthly of [0, 1, 2, 3, 7_939_01, 81_000_00]) {
      expect(splitMonthly(monthly, 'salary') + splitMonthly(monthly, 'advance')).toBe(monthly);
    }
  });
});
