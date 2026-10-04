import type { PerPaycheck } from '../../../app/selectors';
import { formatMoney } from '../../lib/money';
import styles from './PerPaycheckAmount.module.css';

/** Сумма на получку; если зарплата и аванс различаются на копейку — обе, с подписями. */
export function PerPaycheckAmount({ value: { salary, advance } }: { value: PerPaycheck }) {
  if (salary === advance) return <>{formatMoney(salary)}</>;
  return (
    <span className={styles.both}>
      <span>
        {formatMoney(salary)} <small>зарплата</small>
      </span>
      <span>
        {formatMoney(advance)} <small>аванс</small>
      </span>
    </span>
  );
}
