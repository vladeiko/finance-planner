import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function addAccount(page: import('@playwright/test').Page, name: string) {
  await page.goto('/#/plan');
  await page.getByRole('link', { name: 'Добавить счёт' }).click();
  await page.getByLabel('Название').fill(name);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

test('открывается по прямой ссылке, вкладка активна', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Настройки' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('экспорт → очистка → импорт возвращает данные', async ({ page }, testInfo) => {
  await addAccount(page, 'Квартира');
  await page.goto('/#/settings');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать бэкап' }).click();
  const file = testInfo.outputPath('backup.json');
  await (await download).saveAs(file);
  expect(JSON.parse(await readFile(file, 'utf8')).accounts).toHaveLength(1);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('Файл бэкапа').setInputFiles(file);
  await expect(page.getByRole('status')).toContainText('счетов — 1, получек — 0');
  await page.getByRole('button', { name: 'Заменить данные' }).click();
  await expect(page.getByText('Данные заменены.')).toBeVisible();

  await page.reload();
  await page.getByRole('link', { name: 'План', exact: true }).click();
  await expect(page.getByText('Квартира')).toBeVisible();
});

test('битый файл — ошибка, данные не тронуты', async ({ page }) => {
  await addAccount(page, 'Квартира');
  await page.goto('/#/settings');
  await page.getByLabel('Файл бэкапа').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{oops'),
  });
  await expect(page.getByRole('alert')).toContainText('Текущие данные не тронуты');
  await expect(page.getByRole('button', { name: 'Заменить данные' })).toHaveCount(0);

  await page.getByRole('link', { name: 'План', exact: true }).click();
  await expect(page.getByText('Квартира')).toBeVisible();
});

test('отмена импорта ничего не меняет', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByLabel('Файл бэкапа').setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ schemaVersion: 1, accounts: [], planVersions: [], paychecks: [] }),
    ),
  });
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByRole('button', { name: 'Заменить данные' })).toHaveCount(0);
});
