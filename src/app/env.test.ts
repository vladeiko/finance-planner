import { expect, test } from 'vitest';
import { localDate, nextDay, realEnv, timestamp } from './env';

test('localDate — дата по местному времени', () => {
  expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  expect(localDate(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
});

test('nextDay — через границы месяца и года', () => {
  expect(nextDay('2026-09-10')).toBe('2026-09-11');
  expect(nextDay('2026-02-28')).toBe('2026-03-01');
  expect(nextDay('2028-02-28')).toBe('2028-02-29');
  expect(nextDay('2026-12-31')).toBe('2027-01-01');
});

test('timestamp — ISO-строка', () => {
  expect(timestamp(new Date(Date.UTC(2026, 9, 4, 10)))).toBe('2026-10-04T10:00:00.000Z');
});

test('realEnv — настоящие часы и UUID', () => {
  expect(realEnv.now()).toBeInstanceOf(Date);
  expect(realEnv.newId()).toMatch(/^[0-9a-f-]{36}$/);
});
