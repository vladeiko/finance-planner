import { expect, test } from '@playwright/test';

test('манифест: устанавливаемое приложение с PNG-иконками', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ display: 'standalone', lang: 'ru' });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
  }
});

test('офлайн: после первой загрузки приложение открывается без сети, данные на месте', async ({
  page,
  context,
}) => {
  await page.goto('/#/plan');
  await page.getByRole('link', { name: 'Добавить счёт' }).click();
  await page.getByLabel('Название').fill('Квартира');
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Квартира' })).toBeVisible();

  // Ждём, пока сервис-воркер возьмёт страницу под контроль и закеширует ресурсы.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto('/#/plan');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'План' })).toBeVisible();
  await expect(page.getByText('Квартира')).toBeVisible();
});
