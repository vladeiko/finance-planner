import { today } from '../app/env';
import type { StorageError } from '../storage/errors';
import styles from './App.module.css';
import { downloadText } from './lib/download';

/** Данные не загрузились: ничего не сохраняем, даём скачать их как есть. */
export function LoadErrorScreen({ error, raw }: { error: StorageError; raw: string | undefined }) {
  return (
    <main className={styles.main}>
      <h1>Не удалось открыть данные</h1>
      <p role="alert">{error.message}</p>
      <p>
        Приложение ничего не меняет, пока данные не прочитаны, — сохранённое не пропадёт.
        {raw !== undefined && ' Скачайте данные как есть, чтобы не потерять их.'}
      </p>
      {raw !== undefined && (
        <button
          type="button"
          onClick={() => downloadText(`finance-planner-raw-${today()}.json`, raw)}
        >
          Скачать данные как есть
        </button>
      )}
    </main>
  );
}
