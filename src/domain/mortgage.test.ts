import { describe, expect, test } from 'vitest';
import { paymentDay } from './mortgage';

describe('paymentDay — примеры из спецификации (платёж 50, вношу 80)', () => {
  test.each([
    {
      case: '40 + 40 + 40 докинул/проценты',
      balance: 120,
      monthly: 80,
      prepayment: 70,
      remaining: 0,
      next: 80,
    },
    {
      case: '40 + 40, ничего лишнего',
      balance: 80,
      monthly: 80,
      prepayment: 30,
      remaining: 0,
      next: 80,
    },
    {
      case: 'взнос снизил до 45, баланс 60',
      balance: 60,
      monthly: 45,
      prepayment: 5,
      remaining: 5,
      next: 50,
    },
  ])('$case', ({ balance, monthly, prepayment, remaining, next }) => {
    const r = paymentDay({ balance, payment: 50, monthly });
    expect(r.prepayment).toBe(prepayment);
    expect(r.remaining).toBe(remaining);
    expect(r.nextBalance).toBe(next);
    expect(r.nextCovered).toBe(true);
    expect(r.shortfall).toBe(0);
  });
});

describe('paymentDay', () => {
  test('в штатном режиме резерва нет', () => {
    expect(paymentDay({ balance: 120, payment: 50, monthly: 80 }).reserve).toBe(0);
  });

  test('резерв — если взнос меньше платежа', () => {
    expect(paymentDay({ balance: 60, payment: 50, monthly: 45 }).reserve).toBe(5);
  });

  test('баланс меньше платежа — не хватает, досрочки нет', () => {
    const r = paymentDay({ balance: 40, payment: 50, monthly: 80 });
    expect(r.shortfall).toBe(10);
    expect(r.prepayment).toBe(0);
    expect(r.remaining).toBe(-10);
  });

  test('баланс не покрывает резерв — досрочки нет, остаётся всё сверх платежа', () => {
    const r = paymentDay({ balance: 52, payment: 50, monthly: 45 });
    expect(r.prepayment).toBe(0);
    expect(r.remaining).toBe(2);
    expect(r.nextBalance).toBe(47);
    expect(r.nextCovered).toBe(false);
  });

  test('дробные суммы отвергаются', () => {
    expect(() => paymentDay({ balance: 1.5, payment: 1, monthly: 1 })).toThrow(RangeError);
  });
});
