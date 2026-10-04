import { type FormEvent, useId, useMemo, useState } from 'react';
import { archiveAccount, restoreAccount, updateAccount } from '../../../app/actions/accounts';
import {
  addSubitem,
  removeFromPlan,
  removeSubitem,
  setMonthly,
  updateSubitem,
} from '../../../app/actions/plan';
import { today } from '../../../app/env';
import { updateDoc, useDoc } from '../../../app/hooks';
import { accountGroups, planOverview } from '../../../app/selectors';
import type { Account, PlanItem } from '../../../domain/types';
import { MoneyInput } from '../../components/MoneyInput';
import { TextInput } from '../../components/TextInput';
import { formatMoney, parseMoney } from '../../lib/money';
import { href, navigate } from '../../router';
import { BackLink } from './BackLink';
import { PerPaycheckAmount } from './PerPaycheckAmount';
import styles from './AccountScreen.module.css';

export function AccountScreen({ id }: { id: string }) {
  const doc = useDoc((d) => d);
  const account = doc.accounts.find((a) => a.id === id);
  const overview = useMemo(() => planOverview(doc, today()), [doc]);
  const groups = useMemo(() => accountGroups(doc), [doc]);
  const groupsId = useId();

  if (account === undefined) {
    return (
      <div className={styles.screen}>
        <BackLink />
        <h1>Счёт не найден</h1>
        <p>
          Возможно, ссылка устарела. <a href={href('/plan')}>Вернуться к плану</a>
        </p>
      </div>
    );
  }

  if (account.deletedAt !== undefined) {
    return (
      <div className={styles.screen}>
        <BackLink />
        <h1>{account.name}</h1>
        <p>Счёт в архиве: его нет в плане, но старые получки его показывают.</p>
        <button
          type="button"
          className={styles.primary}
          onClick={() => updateDoc((d) => restoreAccount(d, account.id))}
        >
          Вернуть из архива
        </button>
      </div>
    );
  }

  const row = overview.rows.find((r) => r.account.id === id);
  const item = overview.version?.items.find((i) => i.accountId === id);

  return (
    <div className={styles.screen}>
      <BackLink />
      <h1>{account.name}</h1>

      <section className={styles.card} aria-label="Счёт">
        <TextInput
          label="Название"
          value={account.name}
          required
          onCommit={(name) => updateDoc((d) => updateAccount(d, id, { name }))}
        />
        <TextInput
          label="Группа (необязательно)"
          value={account.group ?? ''}
          list={groupsId}
          onCommit={(group) => updateDoc((d) => updateAccount(d, id, { group }))}
        />
        <datalist id={groupsId}>
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={account.role === 'balancing'}
            onChange={(e) =>
              updateDoc((d) =>
                updateAccount(d, id, { role: e.target.checked ? 'balancing' : 'regular' }),
              )
            }
          />
          Из этого счёта добираю, если получка меньше базы (как Балансировка)
        </label>
      </section>

      <section className={styles.card} aria-labelledby="plan-title">
        <h2 id="plan-title">
          {account.kind === 'composite' ? 'Подпункты — составной счёт' : 'Сумма в плане'}
        </h2>
        {account.kind === 'composite' ? (
          <Subitems account={account} item={item} />
        ) : (
          <MoneyInput
            label="В месяц"
            value={item?.monthly}
            allowEmpty
            hint="Пусто — счёт без плановой суммы: в распределение не попадает, но в него можно класть свободные деньги."
            onCommit={(monthly) =>
              updateDoc((d) =>
                monthly === undefined ? removeFromPlan(d, id) : setMonthly(d, id, monthly),
              )
            }
          />
        )}
        {row?.monthly !== undefined && row.share !== undefined && (
          <dl className={styles.totals}>
            {account.kind === 'composite' && (
              <div>
                <dt>В месяц</dt>
                <dd>{formatMoney(row.monthly)}</dd>
              </div>
            )}
            <div>
              <dt>С получки</dt>
              <dd>
                <PerPaycheckAmount value={row.share} />
              </dd>
            </div>
          </dl>
        )}
        {overview.versionUsed && (
          <p className={styles.hint}>
            По текущему плану уже есть получки — правка создаст новую версию плана с сегодняшнего
            дня. Старые получки не изменятся.
          </p>
        )}
      </section>

      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          if (
            !confirm(
              `Убрать «${account.name}» в архив? Из плана он пропадёт, старые получки его сохранят.`,
            )
          ) {
            return;
          }
          updateDoc((d) => archiveAccount(d, id));
          navigate('/plan', { replace: true });
        }}
      >
        В архив
      </button>
    </div>
  );
}

function Subitems({ account, item }: { account: Account; item: PlanItem | undefined }) {
  const subitems = item?.subitems ?? [];
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  const add = (e: FormEvent) => {
    e.preventDefault();
    const monthly = parseMoney(amountText);
    if (monthly === undefined) return setInvalid(true);
    if (name.trim() === '') return;
    updateDoc((d) => addSubitem(d, account.id, { name: name.trim(), monthly }));
    setName('');
    setAmountText('');
    setInvalid(false);
  };

  return (
    <>
      {subitems.length === 0 ? (
        <p className={styles.hint}>Подпунктов пока нет — сумма счёта 0.</p>
      ) : (
        <ul className={styles.subitems}>
          {subitems.map((s) => (
            <li key={s.id} className={styles.subitem}>
              <TextInput
                label="Название подпункта"
                hideLabel
                value={s.name}
                required
                onCommit={(value) =>
                  updateDoc((d) => updateSubitem(d, account.id, s.id, { name: value }))
                }
              />
              <MoneyInput
                label={`Сумма «${s.name}» в месяц`}
                hideLabel
                value={s.monthly}
                onCommit={(monthly) =>
                  monthly !== undefined &&
                  updateDoc((d) => updateSubitem(d, account.id, s.id, { monthly }))
                }
              />
              <button
                type="button"
                aria-label={`Удалить «${s.name}»`}
                onClick={() => updateDoc((d) => removeSubitem(d, account.id, s.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.addSubitem} onSubmit={add} aria-label="Новый подпункт">
        <label className={styles.field}>
          <span>Новый подпункт</span>
          <input value={name} required onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Сумма в месяц</span>
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
    </>
  );
}
