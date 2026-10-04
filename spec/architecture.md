# Архитектура

## Стек

- **React + TypeScript**, сборка **Vite**.
- **CSS Modules + `tokens.css`**, нативная вложенность, адаптив через **container queries**. Без SCSS. Mobile-first: основное использование — с телефона.
- **PWA** через `vite-plugin-pwa`: работает офлайн, устанавливается на домашний экран.
- **Vitest** — тесты доменной логики (обязательны: это деньги).
- Без бэкенда, без библиотек состояния и роутинга.

## Слои и зависимости

```
ui ──▶ app ──▶ domain
        │        ▲
        └──▶ storage ┘ (только типы)
```

| Слой | Ответственность | Нельзя |
|---|---|---|
| `domain` | Типы и чистые функции: распределение, остаток/свободные/экстра, ипотечный калькулятор | Импортировать React, storage, app; брать «сегодня» или случайность из системы — только параметром |
| `storage` | Формат документа, `schemaVersion`, миграции, репозитории, экспорт/импорт | Знать о React |
| `app` | Стор, actions (`doc → doc`), хуки-селекторы, начальное заполнение. Единственное место, где появляются `id`, `updatedAt`, `deletedAt` | Считать деньги в обход domain |
| `ui` | Экраны и компоненты: показывает и вызывает actions | Считать что-либо самому — всё через domain |

## Структура директорий

```
src/
├── main.tsx                      # монтирует <App/>, регистрирует SW
├── domain/
│   ├── types.ts                  # Account, PlanVersion, Paycheck, Money, ISODate…
│   ├── money.ts                  # копейки, splitMonthly(monthly, kind)
│   ├── plan.ts                   # activePlanVersion, monthlyOf (сумма подпунктов)
│   ├── paycheck.ts               # buildAllocations, summarize, transfers, guessKind
│   ├── mortgage.ts               # paymentDay({ balance, payment, monthly })
│   └── *.test.ts                 # тесты рядом с кодом
├── storage/
│   ├── document.ts               # AppDocument, SCHEMA_VERSION, emptyDocument()
│   ├── migrations.ts (+ test)
│   ├── repository.ts             # interface Repository { load(); save(doc) }
│   ├── localStorageRepository.ts
│   ├── exportImport.ts
│   ├── persist.ts                # navigator.storage.persist()
│   └── prefs.ts                  # мелочи вне документа: последние значения калькулятора
├── app/
│   ├── store.ts                  # createStore: get / subscribe / update + автосохранение
│   ├── hooks.ts                  # useDoc(selector) на useSyncExternalStore
│   ├── actions/                  # accounts.ts, plan.ts, paychecks.ts — doc → doc
│   └── seed.ts                   # начальное заполнение из исходного плана
└── ui/
    ├── App.tsx                   # каркас, нижняя панель вкладок
    ├── router.ts                 # свой hash-роутер
    ├── screens/                  # папка на экран, внутри всё, что нужно только ему
    │   └── paycheck/  history/  plan/  mortgage/  settings/
    ├── components/               # MoneyInput, Button, Card, TabBar, Field, Warning…
    ├── lib/                      # formatMoney, parseMoney
    └── styles/                   # tokens.css, global.css
```

Тесты — рядом с кодом (`*.test.ts`).

## Состояние

Свой минимальный стор (модуль-синглтон, без Context и библиотек):

- `createStore(repo, initial)` → `{ get, subscribe, update }`; `update(fn)` применяет action `doc → doc`, сохраняет через репозиторий и оповещает подписчиков.
- Компоненты читают через `useDoc(selector)` (`useSyncExternalStore`).
- **Селектор должен возвращать существующую ссылку** (`d => d.accounts`). Производные массивы (`filter`/`map`) — через `useMemo` поверх `useDoc`, иначе бесконечный ре-рендер.
- Почему не Context: автосохранение и будущая синхронизация живут вне React-дерева (`store.update(() => merged)`), стор тестируется без рендера.

## Роутинг

Свой hash-роутер (~30 строк): `hashchange` + разбор пути. Кнопка «назад» браузера/PWA работает.

| Маршрут | Экран |
|---|---|
| `#/paycheck` | Новая получка (по умолчанию) |
| `#/history` | Список получек |
| `#/history/:id` | Снимок получки |
| `#/plan` | План и счета |
| `#/mortgage` | Калькулятор «День платежа» |
| `#/settings` | Экспорт / импорт |

## Стили

- `tokens.css` — CSS-переменные: цвета (светлая/тёмная тема), отступы, радиусы, шрифты. Хардкод цветов и отступов в модулях запрещён.
- CSS Modules на компонент/экран, нативная вложенность.
- Адаптив — `@container`. Переменные в условия запросов подставить нельзя, поэтому брейкпоинты пишутся числами; договорённые значения:

| Имя | Условие |
|---|---|
| small | по умолчанию (mobile-first) |
| middle | `@container (min-width: 36rem)` |
| big | `@container (min-width: 60rem)` |

Значения можно уточнить при вёрстке — тогда правим эту таблицу и комментарий в `tokens.css`.

## Хранение

- Сейчас: весь документ (см. [data-model.md](./data-model.md)) в `localStorage` одним ключом.
- При старте — `navigator.storage.persist()`, чтобы браузер не вычистил данные.
- **Экспорт/импорт JSON с первого дня** — ручной бэкап и перенос между устройствами.
- Замена хранилища = новый адаптер репозитория; domain/ui не меняются.

## Будущая синхронизация (не MVP)

- Файл JSON в Google Drive (`appDataFolder`) и/или Яндекс.Диск; вход через OAuth в браузере.
- Локальная копия — основная, облако — синхронизируется при появлении сети.
- Слияние: по каждой сущности берём запись с бо́льшим `updatedAt`; удаления — через `deletedAt`, поэтому не теряются.
- SQLite в браузере не нужен: объём данных — десятки записей в месяц.

## Экраны MVP

1. **Получка** — ввод даты и суммы → распределение (с правкой) → разовые траты → свободные и их раскидка → список переводов → сохранить.
2. **История** — список получек, просмотр снимка.
3. **План** — счета (простые/составные), месячные суммы, база; архив.
4. **Ипотека** — калькулятор «День платежа»: 3 поля ввода → платёж, досрочка, остаётся, проверка на следующий месяц.
5. **Настройки** — экспорт/импорт.
