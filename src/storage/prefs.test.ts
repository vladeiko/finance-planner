import { expect, test } from 'vitest';
import { loadMortgagePrefs, MORTGAGE_PREFS_KEY, saveMortgagePrefs } from './prefs';
import { memoryStorage } from './testFixtures';

const prefs = { balance: 120_000_00, payment: 50_000_00, monthly: 81_000_00 };

test('сохранённые значения загружаются обратно', () => {
  const storage = memoryStorage();
  saveMortgagePrefs(prefs, storage);
  expect(loadMortgagePrefs(storage)).toEqual(prefs);
});

test('ничего не сохранено — undefined', () => {
  expect(loadMortgagePrefs(memoryStorage())).toBeUndefined();
});

test.each([
  ['не JSON', '{oops'],
  ['null', 'null'],
  ['не все поля', JSON.stringify({ balance: 1, payment: 2 })],
  ['дробные копейки', JSON.stringify({ ...prefs, balance: 1.5 })],
])('битые значения (%s) — undefined', (_, raw) => {
  const storage = memoryStorage();
  storage.setItem(MORTGAGE_PREFS_KEY, raw);
  expect(loadMortgagePrefs(storage)).toBeUndefined();
});

test('переполнение при сохранении — quota', () => {
  const storage = memoryStorage();
  storage.setItem = () => {
    throw new DOMException('full', 'QuotaExceededError');
  };
  expect(() => saveMortgagePrefs(prefs, storage)).toThrow(
    expect.objectContaining({ code: 'quota' }),
  );
});
