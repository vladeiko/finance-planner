import { expect, type Page, test } from '@playwright/test';

/** Счёт с суммой в месяц через экран плана. */
async function addPlanAccount(page: Page, name: string, monthly: string) {
  await page.goto('/#/plan');
  await page.getByRole('link', { name: 'Добавить счёт' }).click();
  await page.getByLabel('Название').fill(name);
  await page.getByRole('button', { name: 'Создать' }).click();
  const input = page.getByLabel('В месяц', { exact: true });
  await input.fill(monthly);
  await input.press('Enter');
}

async function fillMoney(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Enter');
}

async function setupPlan(page: Page) {
  await addPlanAccount(page, 'Квартира', '81000');
  await addPlanAccount(page, 'НЗ', '20000');
  await page.goto('/#/plan');
  await fillMoney(page, 'База — сумма получки, от которой считается распределение', '125000');
}

test('по умолчанию открывается получка; без плана — подсказка', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/paycheck$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Получка' })).toBeVisible();
  await expect(page.getByText('На эту дату нет плана')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сохранить получку' })).toHaveCount(0);
});

test('получка: правка доли, экстра, свободные, сохранение и история', async ({ page }) => {
  await setupPlan(page);
  await page.goto('/#/paycheck');

  const totals = page.getByRole('region', { name: 'Итоги' });
  await expect(totals).toContainText('Отложено по счетам50 500 ₽');
  await expect(totals).toContainText('Остаток на жизнь74 500 ₽');

  // Правка доли и «вернуть к плану».
  await fillMoney(page, 'Сумма «НЗ»', '20000');
  await expect(totals).toContainText('Отложено по счетам60 500 ₽');
  await expect(page.getByText('по плану 10 000 ₽')).toBeVisible();
  await page.getByRole('button', { name: 'Вернуть «НЗ» к плану' }).click();
  await expect(totals).toContainText('Отложено по счетам50 500 ₽');

  // Пришло больше базы → свободные, разовая трата сначала покрывается ими.
  await fillMoney(page, 'Пришло', '150000');
  await expect(totals).toContainText('Свободные деньги25 000 ₽');
  const extra = page.getByRole('form', { name: 'Новая трата' });
  await extra.getByLabel('Новая трата').fill('Кредитка');
  await extra.getByLabel('Сумма траты').fill('5000');
  await extra.getByRole('button', { name: 'Добавить' }).click();
  await expect(totals).toContainText('Остаток на жизнь74 500 ₽');
  await expect(page.getByText('Не распределено: 20 000 ₽')).toBeVisible();

  // Раскидка свободных: складывается с долей в переводах.
  const free = page.getByRole('form', { name: 'Раскидка свободных' });
  await free.getByRole('combobox').selectOption({ label: 'НЗ' });
  await free.getByLabel('Сумма на счёт').fill('15000');
  await free.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Не распределено: 5 000 ₽')).toBeVisible();
  await expect(page.getByRole('list').filter({ hasText: 'Квартира' }).last()).toContainText(
    '25 000 ₽',
  );

  await page.getByRole('button', { name: 'Сохранить получку' }).click();
  await expect(page).toHaveURL(/#\/history\/.+/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('зарплата');
  await expect(page.getByRole('region', { name: 'Итоги' })).toContainText('Пришло150 000 ₽');
  await expect(page.getByText('Кредитка')).toBeVisible();

  await page.getByRole('link', { name: '← История' }).click();
  await expect(
    page.getByRole('link', { name: /пришло 150 000 ₽ · остаток 74 500 ₽/ }),
  ).toBeVisible();

  // Снимок переживает перезагрузку и убирается в архив.
  await page.reload();
  await page.getByRole('link', { name: /пришло 150 000 ₽/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'В архив' }).click();
  await expect(page).toHaveURL(/#\/history$/);
  await expect(page.getByText('Получек пока нет.')).toBeVisible();
});

test('недобор: подсказка добрать из Балансировки', async ({ page }) => {
  await setupPlan(page);
  await page.goto('/#/paycheck');
  await fillMoney(page, 'Пришло', '120000');
  await expect(page.getByText('Пришло меньше базы на 5 000 ₽')).toBeVisible();
});

test('аванс: вид по дате и ручное переключение', async ({ page }) => {
  await setupPlan(page);
  await page.goto('/#/paycheck');
  await page.getByLabel('Дата').fill('2026-03-20');
  // Плана на эту дату нет — вид всё равно угадывается; переключатель работает.
  await expect(page.getByLabel('Аванс')).toBeChecked();
  await page.getByLabel('Зарплата').check();
  await expect(page.getByLabel('Зарплата')).toBeChecked();
});
