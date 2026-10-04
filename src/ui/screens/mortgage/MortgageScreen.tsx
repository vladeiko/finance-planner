import { useMemo, useState } from 'react';
import {
  calculatePaymentDay,
  loadMortgageInputs,
  type MortgageInputs,
  saveMortgageInputs,
} from '../../../app/mortgage';
import { MoneyInput } from '../../components/MoneyInput';
import { formatMoney } from '../../lib/money';
import styles from './MortgageScreen.module.css';

export function MortgageScreen() {
  const [inputs, setInputs] = useState<MortgageInputs>(loadMortgageInputs);
  const result = useMemo(() => calculatePaymentDay(inputs), [inputs]);

  const change = (patch: Partial<MortgageInputs>) => {
    const next = { ...inputs, ...patch };
    setInputs(next);
    saveMortgageInputs(next);
  };

  return (
    <div className={styles.screen}>
      <h1>День платежа</h1>

      <section className={styles.card} aria-label="Исходные данные">
        <MoneyInput
          label="Баланс ипотечного счёта"
          hint="С процентами и тем, что докинул."
          value={inputs.balance}
          allowEmpty
          onCommit={(balance) => change({ balance })}
        />
        <MoneyInput
          label="Платёж"
          hint="Текущий обязательный платёж."
          value={inputs.payment}
          allowEmpty
          onCommit={(payment) => change({ payment })}
        />
        <MoneyInput
          label="Вношу в месяц"
          hint="Сколько обычно кладу на счёт за месяц."
          value={inputs.monthly}
          allowEmpty
          onCommit={(monthly) => change({ monthly })}
        />
      </section>

      {result === undefined ? (
        <p className={styles.hint}>Введите все три значения — появится расчёт.</p>
      ) : (
        <section className={styles.card} aria-label="Результат">
          {result.shortfall > 0 && (
            <p className={styles.warning} role="alert">
              Не хватает {formatMoney(result.shortfall)} на платёж.
            </p>
          )}
          <dl className={styles.totals}>
            <div className={styles.main}>
              <dt>Досрочка</dt>
              <dd>{formatMoney(result.prepayment)}</dd>
            </div>
            <div>
              <dt>Платёж</dt>
              <dd>{formatMoney(inputs.payment ?? 0)}</dd>
            </div>
            {result.reserve > 0 && (
              <div>
                <dt>Резерв на следующий месяц</dt>
                <dd>{formatMoney(result.reserve)}</dd>
              </div>
            )}
            <div>
              <dt>Останется на счёте</dt>
              <dd>{formatMoney(result.remaining)}</dd>
            </div>
          </dl>
          <p className={result.nextCovered ? styles.ok : styles.warning} role="status">
            {result.nextCovered ? '✓ ' : '✗ '}К следующему 25-му на счёте будет{' '}
            {formatMoney(result.nextBalance)}
            {result.nextCovered ? ' — на платёж хватит.' : ' — на платёж не хватит.'}
          </p>
        </section>
      )}
    </div>
  );
}
