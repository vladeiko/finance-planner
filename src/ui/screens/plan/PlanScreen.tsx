import { useMemo } from 'react';
import { moveAccount, restoreAccount } from '../../../app/actions/accounts';
import { setBase, setEffectiveFrom } from '../../../app/actions/plan';
import { today } from '../../../app/env';
import { updateDoc, useDoc } from '../../../app/hooks';
import { archivedAccounts, planOverview, type PlanRow } from '../../../app/selectors';
import { MoneyInput } from '../../components/MoneyInput';
import { formatDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { href } from '../../router';
import { PerPaycheckAmount } from './PerPaycheckAmount';
import styles from './PlanScreen.module.css';

export function PlanScreen() {
  const doc = useDoc((d) => d);
  const overview = useMemo(() => planOverview(doc, today()), [doc]);
  const archived = useMemo(() => archivedAccounts(doc), [doc]);
  const { version, versionUsed, effectiveFromBounds: bounds, rows } = overview;

  return (
    <div className={styles.screen}>
      <h1>План</h1>

      <section className={styles.card} aria-label="База и итоги">
        <MoneyInput
          label="База — сумма получки, от которой считается распределение"
          value={version?.base}
          onCommit={(base) => base !== undefined && updateDoc((d) => setBase(d, base))}
        />
        <VersionInfo overview={overview} />
        {version !== undefined && (
          <dl className={styles.totals}>
            <div>
              <dt>Отложить с получки</dt>
              <dd>
                <PerPaycheckAmount value={overview.setAside} />
              </dd>
            </div>
            <div>
              <dt>Остаток на жизнь</dt>
              <dd className={overview.remainder.salary < 0 ? styles.negative : undefined}>
                <PerPaycheckAmount value={overview.remainder} />
              </dd>
            </div>
          </dl>
        )}
        {overview.remainder.salary < 0 && (
          <p className={styles.warning} role="status">
            Плановые суммы больше базы — остаток отрицательный.
          </p>
        )}
        {versionUsed && (
          <p className={styles.hint}>
            По этой версии уже есть получки — правки создадут новую версию с сегодняшнего дня.
          </p>
        )}
        {bounds !== undefined && version !== undefined && (
          <EffectiveFrom value={version.effectiveFrom} min={bounds.min} max={bounds.max} />
        )}
      </section>

      <section aria-labelledby="accounts-title" className={styles.section}>
        <h2 id="accounts-title">Счета</h2>
        {rows.length === 0 ? (
          <p className={styles.hint}>Счетов пока нет.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map((row, i) => (
              <AccountRow
                key={row.account.id}
                row={row}
                groupTitle={groupTitle(rows, i)}
                first={i === 0}
                last={i === rows.length - 1}
              />
            ))}
          </ul>
        )}
        <a className={styles.addButton} href={href('/plan/new')}>
          Добавить счёт
        </a>
      </section>

      {archived.length > 0 && (
        <details className={styles.section}>
          <summary>Архив ({archived.length})</summary>
          <ul className={styles.list}>
            {archived.map((account) => (
              <li key={account.id} className={styles.row}>
                <span className={styles.rowMain}>{account.name}</span>
                <button
                  type="button"
                  onClick={() => updateDoc((d) => restoreAccount(d, account.id))}
                  aria-label={`Вернуть «${account.name}» из архива`}
                >
                  Вернуть
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Заголовок группы — перед первым счётом группы, если группы вообще есть. */
function groupTitle(rows: PlanRow[], index: number): string | undefined {
  if (!rows.some((r) => r.account.group)) return undefined;
  const group = rows[index]!.account.group;
  return index === 0 || rows[index - 1]!.account.group !== group
    ? (group ?? 'Без группы')
    : undefined;
}

function VersionInfo({ overview }: { overview: ReturnType<typeof planOverview> }) {
  const { version, effectiveFromBounds } = overview;
  if (version === undefined) {
    return <p className={styles.hint}>Плана ещё нет — задайте базу или сумму счёта.</p>;
  }
  if (effectiveFromBounds !== undefined) return null;
  return <p className={styles.hint}>План действует с {formatDate(version.effectiveFrom)}.</p>;
}

function EffectiveFrom({ value, min, max }: { value: string; min?: string; max: string }) {
  return (
    <label className={styles.dateField}>
      <span>Действует с</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        required
        onChange={(e) => {
          const date = e.target.value;
          if (date && date <= max && (min === undefined || date >= min)) {
            updateDoc((d) => setEffectiveFrom(d, date));
          }
        }}
      />
    </label>
  );
}

function AccountRow({
  row: { account, monthly, share },
  groupTitle,
  first,
  last,
}: {
  row: PlanRow;
  groupTitle: string | undefined;
  first: boolean;
  last: boolean;
}) {
  return (
    <>
      {groupTitle && <li className={styles.group}>{groupTitle}</li>}
      <li className={styles.row}>
        <a className={styles.rowMain} href={href(`/plan/${account.id}`)}>
          <span className={styles.name}>
            {account.name}
            {account.kind === 'composite' && <span className={styles.tag}>составной</span>}
            {account.role === 'balancing' && <span className={styles.tag}>добор</span>}
          </span>
          <span className={styles.amounts}>
            {monthly === undefined || share === undefined ? (
              'без плановой суммы'
            ) : (
              <>
                {formatMoney(monthly)} в месяц · <strong>{formatMoney(share.salary)}</strong> с
                получки
              </>
            )}
          </span>
        </a>
        <div className={styles.move}>
          <button
            type="button"
            disabled={first}
            aria-label={`Поднять «${account.name}»`}
            onClick={() => updateDoc((d) => moveAccount(d, account.id, -1))}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={last}
            aria-label={`Опустить «${account.name}»`}
            onClick={() => updateDoc((d) => moveAccount(d, account.id, 1))}
          >
            ↓
          </button>
        </div>
      </li>
    </>
  );
}
