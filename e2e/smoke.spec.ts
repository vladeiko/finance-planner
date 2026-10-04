import { test, expect } from '@playwright/test';

test('приложение открывается', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Финансовый планировщик' })).toBeVisible();
});
