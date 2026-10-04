import { expect, test } from 'vitest';
import { href, navigate, parseHash } from './router';

test('parseHash', () => {
  expect(parseHash('')).toEqual([]);
  expect(parseHash('#/')).toEqual([]);
  expect(parseHash('#/plan')).toEqual(['plan']);
  expect(parseHash('#/plan/abc/')).toEqual(['plan', 'abc']);
  expect(parseHash('#plan/%D0%B0')).toEqual(['plan', 'а']);
});

test('href', () => {
  expect(href('/plan/new')).toBe('#/plan/new');
});

test('navigate меняет hash', () => {
  navigate('/plan');
  expect(location.hash).toBe('#/plan');
  navigate('/plan/x', { replace: true });
  expect(location.hash).toBe('#/plan/x');
});
