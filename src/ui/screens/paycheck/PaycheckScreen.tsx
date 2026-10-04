import { type FormEvent, useId, useMemo, useState } from 'react';
import { addPaycheck } from '../../../app/actions/paychecks';
import { today } from '../../../app/env';
import { updateDoc, useDoc } from '../../../app/hooks';
import {
  buildPaycheckView,
  emptyDraft,
  type PaycheckDraft,
  withDate,
  withKind,
  withOverride,
} from '../../../app/paycheckDraft';
import type { AccountAmount, Money, PaycheckKind } from '../../../domain/types';
import { MoneyInput } from '../../components/MoneyInput';
import { formatMoney, parseMoney } from '../../lib/money';
import { href, navigate } from '../../router';
import { Transfers } from '../history/Transfers';
import styles from './PaycheckScreen.module.css';

export function PaycheckScreen() {
  const doc = useDoc((d) => d);
  const [draft, setDraft] = useState(() => emptyDraft(today()));
  const view = useMemo(() => buildPaycheckView(doc, draft), [doc, draft]);
  const { summary } = view;
  const balancing = doc.accounts.find((a) => a.role === 'balancing' && a.deletedAt === undefined);

  const change = (patch: Partial<PaycheckDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    if (view.input === undefined) return;
    const { input } = view;
    let id = '';
    updateDoc((d) => {
      const result = addPaycheck(d, input);
      id = result.id;
      return result.doc;
    });
    navigate(`/history/${id}`);
  };

  return (
    <div className={styles.screen}>
      <h1>Получка</h1>

      <section className={styles.card} aria-label="Получка">
        <label className={styles.field}>
          <span className={styles.label}>Дата</span>
          <input
            type="date"
            value={draft.date}
            required
            onChange={(e) => e.target.value && setDraft((d) => withDate(doc, d, e.target.value))}
          />
        </label>
        <KindPicker kind={view.kind} onChange={(kind) => setDraft((d) => withKind(doc, d, kind))} />
        <MoneyInput
          label="Пришло"
          value={view.actual}
          onCommit={(actual) => actual !== undefined && change({ actual })}
        />
      </section>

      {view.version === undefined ? (
        <p className={styles.warning} role="status">
          На эту дату нет плана. <a href={href('/plan')}>Создайте план</a> или выберите другую дату.
        </p>
      ) : (
        summary && (
          <>
            <section className={styles.card} aria-label="Итоги">
              <dl className={styles.totals}>
                <Total label="База" value={view.version.base} />
                <Total label="Отложено по счетам" value={summary.setAside} />
                <Total label="Остаток на жизнь" value={summary.remainder} negative />
                {summary.free > 0 && <Total label="Свободные деньги" value={summary.free} />}
              </dl>
              {summary.remainder < 0 && (
                <p className={styles.warning} role="status">
                  Остаток отрицательный: отложено и потрачено больше базы.
                </p>
              )}
              {summary.shortfall > 0 && (
                <p className={styles.warning} role="status">
                  Пришло меньше базы на {formatMoney(summary.shortfall)} — добрать
                  {balancing ? ` из «${balancing.name}»` : ' из Балансировки'}.
                </p>
              )}
            </section>

            <section className={styles.section} aria-labelledby="alloc-title">
              <h2 id="alloc-title">Распределение</h2>
              {view.rows.length === 0 ? (
                <p className={styles.hint}>В плане нет счетов с суммами.</p>
              ) : (
                <ul className={styles.list}>
                  {view.rows.map((row) => (
                    <li key={row.accountId} className={styles.row}>
                      <div className={styles.rowMain}>
                        <span className={styles.name}>{row.name}</span>
                        {row.changed && (
                          <span className={styles.hint}>
                            по плану {formatMoney(row.planned)} ·{' '}
                            <button
                              type="button"
                              className={styles.link}
                              aria-label={`Вернуть «${row.name}» к плану`}
                              onClick={() =>
                                setDraft((d) => withOverride(d, row.accountId, undefined))
                              }
                            >
                              вернуть к плану
                            </button>
                          </span>
                        )}
                      </div>
                      <div className={styles.amountInput}>
                        <MoneyInput
                          label={`Сумма «${row.name}»`}
                          hideLabel
                          value={row.amount}
                          onCommit={(amount) =>
                            amount !== undefined &&
                            setDraft((d) => withOverride(d, row.accountId, amount))
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Extras
              extras={draft.extras}
              onChange={(extras) => change({ extras })}
              coveredByFree={summary.extrasFromFree}
            />

            {(summary.freeLeft > 0 || view.freeRows.length > 0) && (
              <FreeMoney
                rows={view.freeRows}
                accounts={view.freeAccounts}
                left={summary.freeLeft}
                undistributed={summary.undistributed}
                onChange={(freeDistribution) => change({ freeDistribution })}
              />
            )}

            <section className={styles.section} aria-labelledby="transfers-title">
              <h2 id="transfers-title">Переводы</h2>
              <Transfers rows={view.transfers} />
            </section>

            <label className={styles.field}>
              <span className={styles.label}>Заметка (необязательно)</span>
              <input value={draft.note} onChange={(e) => change({ note: e.target.value })} />
            </label>

            <button type="button" className={styles.primary} onClick={save}>
              Сохранить получку
            </button>
          </>
        )
      )}
    </div>
  );
}

function Total({ label, value, negative }: { label: string; value: Money; negative?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={negative && value < 0 ? styles.negative : undefined}>{formatMoney(value)}</dd>
    </div>
  );
}

function KindPicker({
  kind,
  onChange,
}: {
  kind: PaycheckKind;
  onChange: (kind: PaycheckKind) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.kind}>
      <legend className={styles.label}>Вид получки</legend>
      {(
        [
          ['salary', 'Зарплата'],
          ['advance', 'Аванс'],
        ] as const
      ).map(([value, label]) => (
        <label key={value} className={styles.check}>
          <input
            type="radio"
            name={name}
            checked={kind === value}
            onChange={() => onChange(value)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

function Extras({
  extras,
  onChange,
  coveredByFree,
}: {
  extras: PaycheckDraft['extras'];
  onChange: (extras: PaycheckDraft['extras']) => void;
  coveredByFree: Money;
}) {
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  const add = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(amountText);
    if (amount === undefined) return setInvalid(true);
    onChange([...extras, { name: name.trim(), amount }]);
    setName('');
    setAmountText('');
    setInvalid(false);
  };

  return (
    <section className={styles.section} aria-labelledby="extras-title">
      <h2 id="extras-title">Разовые траты</h2>
      {extras.length > 0 && (
        <ul className={styles.list}>
          {extras.map((extra, i) => (
            <li key={i} className={styles.row}>
              <span className={styles.rowMain}>{extra.name}</span>
              <span className={styles.amount}>{formatMoney(extra.amount)}</span>
              <button
                type="button"
                aria-label={`Удалить «${extra.name}»`}
                onClick={() => onChange(extras.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {coveredByFree > 0 && (
        <p className={styles.hint}>Из свободных денег покрыто {formatMoney(coveredByFree)}.</p>
      )}
      <form className={styles.addForm} onSubmit={add} aria-label="Новая трата">
        <label className={styles.field}>
          <span className={styles.label}>Новая трата</span>
          <input value={name} required onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Сумма траты</span>
          <input
            className={styles.money}
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            required
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => setAmountText(e.target.value)}
          />
          {invalid && (
            <span id={errorId} className={styles.error}>
              Введите сумму, например 8 000 или 8 000,50
            </span>
          )}
        </label>
        <button type="submit">Добавить</button>
      </form>
    </section>
  );
}

function FreeMoney({
  rows,
  accounts,
  left,
  undistributed,
  onChange,
}: {
  rows: (AccountAmount & { name: string })[];
  accounts: { id: string; name: string }[];
  left: Money;
  undistributed: Money;
  onChange: (rows: AccountAmount[]) => void;
}) {
  const [accountId, setAccountId] = useState('');
  const [amountText, setAmountText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  const plain = rows.map(({ accountId, amount }) => ({ accountId, amount }));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(amountText);
    if (amount === undefined) return setInvalid(true);
    onChange([...plain, { accountId: accountId || accounts[0]!.id, amount }]);
    setAmountText('');
    setInvalid(false);
  };

  return (
    <section className={styles.section} aria-labelledby="free-title">
      <h2 id="free-title">Свободные деньги</h2>
      <p className={styles.hint}>Свободных после трат: {formatMoney(left)}</p>
      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((row, i) => (
            <li key={i} className={styles.row}>
              <span className={styles.rowMain}>{row.name}</span>
              <span className={styles.amount}>{formatMoney(row.amount)}</span>
              <button
                type="button"
                aria-label={`Убрать «${row.name}» из раскидки`}
                onClick={() => onChange(plain.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={undistributed < 0 ? styles.warning : styles.hint} role="status">
        {undistributed < 0
          ? `Раскидано больше свободных на ${formatMoney(-undistributed)}`
          : `Не распределено: ${formatMoney(undistributed)}`}
      </p>
      {accounts.length > 0 && (
        <form className={styles.addForm} onSubmit={add} aria-label="Раскидка свободных">
          <label className={styles.field}>
            <span className={styles.label}>Счёт</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Сумма на счёт</span>
            <input
              className={styles.money}
              inputMode="decimal"
              autoComplete="off"
              value={amountText}
              required
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId : undefined}
              onChange={(e) => setAmountText(e.target.value)}
            />
            {invalid && (
              <span id={errorId} className={styles.error}>
                Введите сумму, например 8 000 или 8 000,50
              </span>
            )}
          </label>
          <button type="submit">Добавить</button>
        </form>
      )}
    </section>
  );
}
