import { expect, type Page, test } from '@playwright/test';

async function addAccount(page: Page, name: string, kind: 'Простой' | 'Составной' = 'Простой') {
  await page.goto('/#/plan');
  await page.getByRole('link', { name: 'Добавить счёт' }).click();
  await page.getByLabel('Название').fill(name);
  await page.getByLabel(new RegExp(`^${kind}`)).check();
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

/** Ввод суммы в поле и подтверждение Enter (сохраняется по уходу с поля). */
async function fillMoney(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Enter');
}

test('открывается по прямой ссылке, пустой план', async ({ page }) => {
  await page.goto('/#/plan');
  await expect(page.getByRole('heading', { level: 1, name: 'План' })).toBeVisible();
  await expect(page.getByText('Плана ещё нет')).toBeVisible();
  await expect(page.getByText('Счетов пока нет.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'План', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('неизвестный адрес ведёт на план', async ({ page }) => {
  await page.goto('/#/nowhere');
  await expect(page).toHaveURL(/#\/plan$/);
});

test('простой счёт: сумма, доля с получки, база и остаток; данные переживают перезагрузку', async ({
  page,
}) => {
  await addAccount(page, 'Квартира');
  await fillMoney(page, 'В месяц', '81000');
  await expect(page.locator('dl')).toContainText('С получки40 500 ₽');

  await page.goBack();
  await expect(page).toHaveURL(/#\/plan$/);
  await expect(page.getByRole('link', { name: /Квартира/ })).toContainText(
    '81 000 ₽ в месяц · 40 500 ₽ с получки',
  );

  await fillMoney(page, 'База — сумма получки, от которой считается распределение', '125 000');
  const totals = page.getByRole('region', { name: 'База и итоги' }).locator('dl');
  await expect(totals).toContainText('Отложить с получки40 500 ₽');
  await expect(totals).toContainText('Остаток на жизнь84 500 ₽');

  await page.reload();
  await expect(totals).toContainText('Остаток на жизнь84 500 ₽');
});

test('неверная сумма не сохраняется и подсвечивается', async ({ page }) => {
  await addAccount(page, 'НЗ');
  await fillMoney(page, 'В месяц', '12,345');
  await expect(page.getByLabel('В месяц', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Введите сумму')).toBeVisible();
});

test('составной счёт: сумма из подпунктов, лишняя копейка — в зарплату', async ({ page }) => {
  await addAccount(page, 'Подписки', 'Составной');
  const add = page.getByRole('form', { name: 'Новый подпункт' });
  for (const [name, amount] of [
    ['ChatGPT', '2000'],
    ['VPS', '1000,01'],
  ] as const) {
    await add.getByLabel('Новый подпункт').fill(name);
    await add.getByLabel('Сумма в месяц').fill(amount);
    await add.getByRole('button', { name: 'Добавить' }).click();
  }
  const totals = page.locator('dl');
  await expect(totals).toContainText('В месяц3 000,01 ₽');
  await expect(totals).toContainText('С получки1 500,01 ₽ зарплата1 500 ₽ аванс');

  await fillMoney(page, 'Сумма «VPS» в месяц', '1000');
  await expect(totals).toContainText('С получки1 500 ₽');
  await page.getByRole('button', { name: 'Удалить «ChatGPT»' }).click();
  await expect(totals).toContainText('В месяц1 000 ₽');
});

test('архив: счёт пропадает из плана и возвращается без суммы', async ({ page }) => {
  await addAccount(page, 'Отпуск');
  await fillMoney(page, 'В месяц', '10000');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'В архив' }).click();

  await expect(page).toHaveURL(/#\/plan$/);
  await expect(page.getByRole('link', { name: /Отпуск/ })).toHaveCount(0);
  await page.getByText('Архив (1)').click();
  await page.getByRole('button', { name: 'Вернуть «Отпуск» из архива' }).click();
  await expect(page.getByRole('link', { name: /Отпуск/ })).toContainText('без плановой суммы');
});

test('порядок счетов меняется стрелками', async ({ page }) => {
  await addAccount(page, 'Первый');
  await addAccount(page, 'Второй');
  await page.goto('/#/plan');
  await page.getByRole('button', { name: 'Поднять «Второй»' }).click();
  await expect(page.getByRole('list').first().getByRole('link')).toHaveText([/Второй/, /Первый/]);
});

test('битые данные: экран ошибки, данные не затираются', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('finance-planner:document', '{oops');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/#/plan');
  await expect(page.getByRole('heading', { name: 'Не удалось открыть данные' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Скачать данные как есть' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('finance-planner:document'))).toBe('{oops');
});
