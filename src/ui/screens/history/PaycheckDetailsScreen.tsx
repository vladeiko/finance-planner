import { useMemo } from 'react';
import { archivePaycheck } from '../../../app/actions/paychecks';
import { paycheckDetails } from '../../../app/history';
import { updateDoc, useDoc } from '../../../app/hooks';
import { formatDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { href, navigate } from '../../router';
import styles from './PaycheckDetailsScreen.module.css';
import { Transfers } from './Transfers';

function BackLink() {
  return (
    <a className={styles.back} href={href('/history')}>
      ← История
    </a>
  );
}

export function PaycheckDetailsScreen({ id }: { id: string }) {
  const doc = useDoc((d) => d);
  const details = useMemo(() => paycheckDetails(doc, id), [doc, id]);

  if (details === undefined || details.paycheck.deletedAt !== undefined) {
    return (
      <div className={styles.screen}>
        <BackLink />
        <h1>Получка не найдена</h1>
        <p>Возможно, она убрана в архив или ссылка устарела.</p>
      </div>
    );
  }

  const { paycheck: p, summary: s } = details;
  const rows: [string, number][] = [
    ['Пришло', p.actual],
    ['База', p.base],
    ['Отложено по счетам', s.setAside],
    ['Разовые траты', s.extras],
    ['Остаток на жизнь', s.remainder],
  ];

  return (
    <div className={styles.screen}>
      <BackLink />
      <h1>
        {formatDate(p.date)} · {p.kind === 'salary' ? 'зарплата' : 'аванс'}
      </h1>

      <section className={styles.card} aria-label="Итоги">
        <dl className={styles.totals}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd
                className={label === 'Остаток на жизнь' && value < 0 ? styles.negative : undefined}
              >
                {formatMoney(value)}
              </dd>
            </div>
          ))}
          {s.free > 0 && (
            <div>
              <dt>Свободные деньги</dt>
              <dd>
                {formatMoney(s.free)}
                {s.undistributed !== 0 && ` (не распределено ${formatMoney(s.undistributed)})`}
              </dd>
            </div>
          )}
        </dl>
        {details.planEffectiveFrom !== undefined && (
          <p className={styles.hint}>План от {formatDate(details.planEffectiveFrom)}.</p>
        )}
        {p.note && <p>{p.note}</p>}
      </section>

      <section className={styles.section} aria-labelledby="transfers-title">
        <h2 id="transfers-title">Переводы</h2>
        <Transfers rows={details.transfers} />
      </section>

      {p.extras.length > 0 && (
        <section className={styles.section} aria-labelledby="extras-title">
          <h2 id="extras-title">Разовые траты</h2>
          <ul className={styles.list}>
            {p.extras.map((e) => (
              <li key={e.id} className={styles.row}>
                <span>{e.name}</span>
                <span className={styles.amount}>{formatMoney(e.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          if (!confirm('Убрать получку в архив? Из истории она пропадёт.')) return;
          updateDoc((d) => archivePaycheck(d, id));
          navigate('/history', { replace: true });
        }}
      >
        В архив
      </button>
    </div>
  );
}
