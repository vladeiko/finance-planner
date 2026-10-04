import type { TransferRow } from '../../../app/paycheckDraft';
import { formatMoney } from '../../lib/money';
import styles from './Transfers.module.css';

/** Список переводов по счетам: доли по плану плюс раскидка свободных. */
export function Transfers({ rows }: { rows: TransferRow[] }) {
  if (rows.length === 0) return <p className={styles.empty}>Переводов нет.</p>;
  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.accountId} className={styles.row}>
          <span>{row.name}</span>
          <span className={styles.amount}>{formatMoney(row.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
