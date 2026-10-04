# Модель данных

## Общие соглашения

- **Деньги** — целые числа в копейках (`number`, безопасно до ~9·10^13 ₽). Никаких float в расчётах.
- **Даты** — строки `YYYY-MM-DD` (без времени и часовых поясов). Метки изменения — ISO-строки с временем.
- У каждой хранимой сущности:
  - `id` — UUID (`crypto.randomUUID()`);
  - `updatedAt` — время последнего изменения;
  - `deletedAt?` — мягкое удаление/архив. Физически ничего не удаляем.
  Это нужно для будущей синхронизации: слияние двух копий = «по каждому `id` берём запись с бо́льшим `updatedAt`».
- Получки — **снимки**: хранят итоговые числа, не ссылаются на формулы. Ссылки на счета — по `id`, имена берутся из (возможно архивных) сущностей.

## Сущности

### Account — счёт в банке
```ts
{
  id, updatedAt, deletedAt?,
  name: string,              // "Квартира", "НЗ", "Подписки", "Балансировка"
  kind: 'simple' | 'composite',
  role: 'regular' | 'balancing', // balancing — откуда добирать недобор
  group?: string,            // визуальная группа: "Регулярные", "Накопления"
  order: number,             // порядок отображения
}
```
Один счёт = одна строка плана. Месячные суммы и подпункты живут в версии плана, а не в счёте.

### PlanVersion — версия плана
```ts
{
  id, updatedAt, deletedAt?,
  effectiveFrom: Date,       // действует с этой даты включительно
  base: Money,               // 125 000_00
  items: Array<{
    accountId: string,
    monthly?: Money,         // для simple
    subitems?: Array<{ id: string, name: string, monthly: Money }>, // для composite
  }>,
}
```
- Активная версия на дату D — с максимальным `effectiveFrom <= D`.
- Правка плана в UI = новая версия (или правка текущей, если по ней ещё нет получек).
- Счёт, которого нет в `items` версии (например, Балансировка), в распределение не попадает, но доступен для раскидки свободных денег.

### Paycheck — получка (снимок)
```ts
{
  id, updatedAt, deletedAt?,
  date: Date,
  kind: 'salary' | 'advance', // зарплата / аванс; по умолчанию по дате, нужен для лишней копейки
  actual: Money,             // фактически пришло
  base: Money,               // база на момент сохранения
  planVersionId: string,     // для справки
  allocations: Array<{ accountId: string, amount: Money }>,
  extras: Array<{ id: string, name: string, amount: Money }>,
  freeDistribution: Array<{ accountId: string, amount: Money }>,
  topUpFromBalancing: Money, // недобор, взятый из Балансировки (0 обычно)
  note?: string,
}
```
Производные значения (свободные, остаток и т.д.) **не хранятся**, считаются функцией домена из полей снимка — формулы в [product.md](./product.md).

## Хранилище (формат файла / localStorage)

Один JSON-документ:
```ts
{
  schemaVersion: number,
  accounts: Account[],
  planVersions: PlanVersion[],
  paychecks: Paycheck[],
}
```
- `schemaVersion` + функции миграций при загрузке.
- Этот же формат — для экспорта/импорта и будущей синхронизации через Google Drive / Яндекс.Диск.
- Ипотечный калькулятор в документ не входит: он ничего не хранит, кроме последних введённых значений (отдельный ключ localStorage, только для подстановки).
