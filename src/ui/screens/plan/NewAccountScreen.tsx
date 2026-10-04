import { type FormEvent, useId, useMemo, useState } from 'react';
import { createAccount } from '../../../app/actions/accounts';
import { updateDoc, useDoc } from '../../../app/hooks';
import { accountGroups } from '../../../app/selectors';
import type { AccountKind } from '../../../domain/types';
import { navigate } from '../../router';
import { BackLink } from './BackLink';
import styles from './AccountScreen.module.css';

export function NewAccountScreen() {
  const doc = useDoc((d) => d);
  const groups = useMemo(() => accountGroups(doc), [doc]);
  const groupsId = useId();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('simple');
  const [group, setGroup] = useState('');
  const [balancing, setBalancing] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') return;
    let id = '';
    updateDoc((d) => {
      const result = createAccount(d, {
        name,
        kind,
        group,
        role: balancing ? 'balancing' : 'regular',
      });
      id = result.id;
      return result.doc;
    });
    navigate(`/plan/${id}`, { replace: true });
  };

  return (
    <form className={styles.screen} onSubmit={submit}>
      <BackLink />
      <h1>Новый счёт</h1>
      <div className={styles.card}>
        <label className={styles.field}>
          <span>Название</span>
          <input value={name} required onChange={(e) => setName(e.target.value)} />
        </label>
        <fieldset className={styles.kind}>
          <legend>Вид</legend>
          <label>
            <input
              type="radio"
              name="kind"
              checked={kind === 'simple'}
              onChange={() => setKind('simple')}
            />
            Простой — одна сумма в месяц
          </label>
          <label>
            <input
              type="radio"
              name="kind"
              checked={kind === 'composite'}
              onChange={() => setKind('composite')}
            />
            Составной — сумма из подпунктов (как Подписки)
          </label>
        </fieldset>
        <label className={styles.field}>
          <span>Группа (необязательно)</span>
          <input value={group} list={groupsId} onChange={(e) => setGroup(e.target.value)} />
          <datalist id={groupsId}>
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={balancing}
            onChange={(e) => setBalancing(e.target.checked)}
          />
          Из этого счёта добираю, если получка меньше базы (как Балансировка)
        </label>
      </div>
      <p className={styles.hint}>Вид счёта потом не меняется. Сумму зададите на следующем шаге.</p>
      <button type="submit" className={styles.primary}>
        Создать
      </button>
    </form>
  );
}
