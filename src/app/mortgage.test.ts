import { beforeEach, describe, expect, test } from 'vitest';
import { calculatePaymentDay, loadMortgageInputs, saveMortgageInputs } from './mortgage';

const rub = (value: number) => value * 100;

describe('calculatePaymentDay', () => {
  test('пока не все поля введены — undefined', () => {
    expect(
      calculatePaymentDay({ balance: rub(120), payment: rub(50), monthly: undefined }),
    ).toBeUndefined();
  });

  test('пример из спецификации: платёж 50, вношу 80, баланс 120 → досрочка 70', () => {
    const result = calculatePaymentDay({ balance: rub(120), payment: rub(50), monthly: rub(80) });
    expect(result).toMatchObject({ prepayment: rub(70), remaining: 0, nextCovered: true });
  });
});

describe('подстановка последних значений', () => {
  beforeEach(() => localStorage.clear());

  test('пусто → поля пустые', () => {
    expect(loadMortgageInputs()).toEqual({
      balance: undefined,
      payment: undefined,
      monthly: undefined,
    });
  });

  test('сохраняются только полностью введённые значения', () => {
    saveMortgageInputs({ balance: rub(1), payment: undefined, monthly: rub(3) });
    expect(loadMortgageInputs().balance).toBeUndefined();
    const full = { balance: rub(120), payment: rub(50), monthly: rub(80) };
    saveMortgageInputs(full);
    expect(loadMortgageInputs()).toEqual(full);
  });

  test('битые данные в хранилище — пустые поля, без ошибки', () => {
    localStorage.setItem('finance-planner:prefs:mortgage', '{oops');
    expect(loadMortgageInputs().balance).toBeUndefined();
  });
});
