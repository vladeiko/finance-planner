import { useId, useState } from 'react';
import styles from './Field.module.css';

interface Props {
  label: string;
  /** Подпись только для экранных дикторов (когда смысл ясен из соседних элементов). */
  hideLabel?: boolean;
  value: string;
  /** Вызывается при уходе с поля или Enter, если текст изменился. */
  onCommit: (value: string) => void;
  /** Пустое значение не принимается — поле вернётся к прежнему. */
  required?: boolean;
  hint?: string;
  list?: string;
}

/** Текстовое поле, сохраняющее значение по уходу с поля, а не на каждый символ. */
export function TextInput({ label, hideLabel, value, onCommit, required, hint, list }: Props) {
  const id = useId();
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    // Значение поменялось снаружи — показываем его.
    setShown(value);
    setText(value);
  }

  const commit = () => {
    const trimmed = text.trim();
    if (required && trimmed === '') return setText(value);
    if (trimmed !== value) onCommit(trimmed);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <input
        id={id}
        value={text}
        list={list}
        enterKeyHint="done"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
