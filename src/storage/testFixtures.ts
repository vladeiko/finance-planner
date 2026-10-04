import type { AppDocument } from './document';

const T = '2026-10-04T10:00:00.000Z';

/** Реалистичный документ для тестов: архивный счёт, составной счёт, две получки. */
export function sampleDocument(): AppDocument {
  return {
    schemaVersion: 1,
    accounts: [
      {
        id: 'flat',
        updatedAt: T,
        name: 'Квартира',
        kind: 'simple',
        role: 'regular',
        group: 'Регулярные',
        order: 0,
      },
      { id: 'subs', updatedAt: T, name: 'Подписки', kind: 'composite', role: 'regular', order: 1 },
      {
        id: 'balancing',
        updatedAt: T,
        name: 'Балансировка',
        kind: 'simple',
        role: 'balancing',
        order: 2,
      },
      {
        id: 'old',
        updatedAt: T,
        deletedAt: T,
        name: 'Отпуск',
        kind: 'simple',
        role: 'regular',
        order: 3,
      },
    ],
    planVersions: [
      {
        id: 'plan-1',
        updatedAt: T,
        effectiveFrom: '2026-09-01',
        base: 125_000_00,
        items: [
          { accountId: 'flat', monthly: 81_000_00 },
          { accountId: 'old', monthly: 10_000_00 },
          { accountId: 'subs', subitems: [{ id: 'gpt', name: 'ChatGPT', monthly: 2_000_00 }] },
        ],
      },
    ],
    paychecks: [
      {
        id: 'p-1',
        updatedAt: T,
        date: '2026-09-05',
        kind: 'salary',
        actual: 150_000_00,
        base: 125_000_00,
        planVersionId: 'plan-1',
        allocations: [
          { accountId: 'flat', amount: 40_500_00 },
          { accountId: 'old', amount: 5_000_00 },
          { accountId: 'subs', amount: 1_000_00 },
        ],
        extras: [{ id: 'e-1', name: 'Кредитка', amount: 10_000_00 }],
        freeDistribution: [{ accountId: 'balancing', amount: 15_000_00 }],
        topUpFromBalancing: 0,
        note: 'премия',
      },
      {
        id: 'p-2',
        updatedAt: T,
        date: '2026-09-18',
        kind: 'advance',
        actual: 120_000_00,
        base: 125_000_00,
        planVersionId: 'plan-1',
        allocations: [{ accountId: 'flat', amount: 40_500_00 }],
        extras: [],
        freeDistribution: [],
        topUpFromBalancing: 5_000_00,
      },
    ],
  };
}

/** Простая реализация `Storage` в памяти; методы можно подменить для проверки ошибок. */
export function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}
