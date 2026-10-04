import { useState } from 'react';
import { updateDoc, useDoc } from '../../../app/hooks';
import { backupFile, type BackupPreview, readBackup, replaceDocument } from '../../../app/settings';
import { downloadText } from '../../lib/download';
import styles from './SettingsScreen.module.css';

type ImportState =
  | { status: 'idle' }
  | { status: 'checked'; fileName: string; preview: BackupPreview }
  | { status: 'failed'; message: string }
  | { status: 'done' };

export function SettingsScreen() {
  const doc = useDoc((d) => d);
  const [state, setState] = useState<ImportState>({ status: 'idle' });

  const exportData = () => {
    const { fileName, text } = backupFile(doc);
    downloadText(fileName, text);
  };

  const pickFile = async (file: File | undefined) => {
    if (file === undefined) return;
    try {
      setState({ status: 'checked', fileName: file.name, preview: readBackup(await file.text()) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось прочитать файл.';
      setState({ status: 'failed', message });
    }
  };

  return (
    <div className={styles.screen}>
      <h1>Настройки</h1>

      <section className={styles.card} aria-labelledby="export-title">
        <h2 id="export-title">Экспорт</h2>
        <p className={styles.hint}>
          Скачать все данные одним JSON-файлом — бэкап или перенос на другое устройство.
        </p>
        <button type="button" onClick={exportData}>
          Скачать бэкап
        </button>
      </section>

      <section className={styles.card} aria-labelledby="import-title">
        <h2 id="import-title">Импорт</h2>
        <p className={styles.hint}>
          Данные из файла заменят текущие. Перед заменой покажем, что в файле.
        </p>
        <label className={styles.file}>
          <span>Файл бэкапа</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              void pickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>

        {state.status === 'failed' && (
          <p role="alert" className={styles.error}>
            {state.message} Текущие данные не тронуты.
          </p>
        )}

        {state.status === 'checked' && (
          <div className={styles.confirm} role="status">
            <p>
              В файле «{state.fileName}»: счетов — {state.preview.accounts}, получек —{' '}
              {state.preview.paychecks}. Текущие данные будут заменены.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => {
                  updateDoc(replaceDocument(state.preview.doc));
                  setState({ status: 'done' });
                }}
              >
                Заменить данные
              </button>
              <button type="button" onClick={() => setState({ status: 'idle' })}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {state.status === 'done' && <p role="status">Данные заменены.</p>}
      </section>
    </div>
  );
}
