import { useMemo } from 'react';
import { useDoc } from '../../../app/hooks';
import { historyItems } from '../../../app/history';
import { formatDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { href } from '../../router';
import styles from './HistoryScreen.module.css';

export function HistoryScreen() {
  const paychecks = useDoc((d) => d.paychecks);
  const list = useMemo(() => historyItems(paychecks), [paychecks]);

  return (
    <div className={styles.screen}>
      <h1>История</h1>
      {list.length === 0 ? (
        <p className={styles.hint}>
          Получек пока нет. <a href={href('/paycheck')}>Добавить получку</a>
        </p>
      ) : (
        <ul className={styles.list}>
          {list.map(({ paycheck: p, remainder }) => (
            <li key={p.id}>
              <a className={styles.row} href={href(`/history/${p.id}`)}>
                <span className={styles.name}>
                  {formatDate(p.date)} · {p.kind === 'salary' ? 'зарплата' : 'аванс'}
                </span>
                <span className={styles.amounts}>
                  пришло {formatMoney(p.actual)} · остаток {formatMoney(remainder)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
