import { expect, type Page, test } from '@playwright/test';

async function fillMoney(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Enter');
}

test('открывается по прямой ссылке; без данных — подсказка', async ({ page }) => {
  await page.goto('/#/mortgage');
  await expect(page.getByRole('heading', { level: 1, name: 'День платежа' })).toBeVisible();
  await expect(page.getByText('Введите все три значения')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ипотека' })).toHaveAttribute('aria-current', 'page');
});

test('штатный расчёт: всё сверх платежа — в досрочку; значения запоминаются', async ({ page }) => {
  await page.goto('/#/mortgage');
  await fillMoney(page, 'Баланс ипотечного счёта', '120000');
  await fillMoney(page, 'Платёж', '50000');
  await fillMoney(page, 'Вношу в месяц', '80000');

  const result = page.getByRole('region', { name: 'Результат' });
  await expect(result).toContainText('Досрочка70 000 ₽');
  await expect(result).toContainText('Останется на счёте0 ₽');
  await expect(result).toContainText('на платёж хватит');

  await page.reload();
  await expect(page.getByLabel('Платёж', { exact: true })).toHaveValue(/^50\s000$/);
  await expect(result).toContainText('Досрочка70 000 ₽');
});

test('взнос меньше платежа: резерв; баланса не хватает — предупреждение', async ({ page }) => {
  await page.goto('/#/mortgage');
  await fillMoney(page, 'Баланс ипотечного счёта', '60000');
  await fillMoney(page, 'Платёж', '50000');
  await fillMoney(page, 'Вношу в месяц', '45000');
  const result = page.getByRole('region', { name: 'Результат' });
  await expect(result).toContainText('Досрочка5 000 ₽');
  await expect(result).toContainText('Резерв на следующий месяц5 000 ₽');

  await fillMoney(page, 'Баланс ипотечного счёта', '40000');
  await expect(page.getByRole('alert').filter({ hasText: 'Не хватает' })).toContainText(
    'Не хватает 10 000 ₽ на платёж',
  );
});
