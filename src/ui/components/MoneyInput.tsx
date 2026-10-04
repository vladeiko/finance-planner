import { useId, useState } from 'react';
import type { Money } from '../../domain/types';
import { formatAmount, parseMoney } from '../lib/money';
import styles from './Field.module.css';

interface Props {
  label: string;
  hideLabel?: boolean;
  value: Money | undefined;
  /** Вызывается при уходе с поля или Enter, если сумма изменилась. */
  onCommit: (value: Money | undefined) => void;
  /** Пустое поле допустимо и означает `undefined`. */
  allowEmpty?: boolean;
  hint?: string;
}

const toText = (value: Money | undefined) => (value === undefined ? '' : formatAmount(value));

/** Поле суммы в рублях: цифровая клавиатура, копейки через запятую, сохранение по уходу с поля. */
export function MoneyInput({ label, hideLabel, value, onCommit, allowEmpty, hint }: Props) {
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState(toText(value));
  const [shown, setShown] = useState(value);
  const [invalid, setInvalid] = useState(false);
  if (value !== shown) {
    // Значение поменялось снаружи — показываем его.
    setShown(value);
    setText(toText(value));
    setInvalid(false);
  }

  const commit = () => {
    if (text.trim() === '') {
      if (!allowEmpty) return setText(toText(value));
      setInvalid(false);
      if (value !== undefined) onCommit(undefined);
      return;
    }
    const parsed = parseMoney(text);
    if (parsed === undefined) return setInvalid(true);
    setInvalid(false);
    setText(toText(parsed));
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.money}
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        value={text}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {invalid && (
        <p id={errorId} className={styles.error}>
          Введите сумму, например 8 000 или 8 000,50
        </p>
      )}
      {hint && !invalid && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
