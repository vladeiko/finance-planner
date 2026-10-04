import { expect, test } from 'vitest';
import { formatDate } from './date';

test('formatDate', () => {
  expect(formatDate('2026-09-01')).toBe('01.09.2026');
});
