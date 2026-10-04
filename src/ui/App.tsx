import { useEffect } from 'react';
import { useSaveError } from '../app/hooks';
import styles from './App.module.css';
import { TabBar } from './components/TabBar';
import { DEFAULT_PATH, navigate, useRoute } from './router';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { PaycheckDetailsScreen } from './screens/history/PaycheckDetailsScreen';
import { PaycheckScreen } from './screens/paycheck/PaycheckScreen';
import { AccountScreen } from './screens/plan/AccountScreen';
import { NewAccountScreen } from './screens/plan/NewAccountScreen';
import { PlanScreen } from './screens/plan/PlanScreen';

function screenFor([section, id]: string[]) {
  if (section === 'paycheck') return <PaycheckScreen />;
  if (section === 'history') {
    return id === undefined ? <HistoryScreen /> : <PaycheckDetailsScreen id={id} />;
  }
  if (section === 'plan') {
    if (id === undefined) return <PlanScreen />;
    if (id === 'new') return <NewAccountScreen />;
    return <AccountScreen id={id} />;
  }
  return undefined;
}

export function App() {
  const route = useRoute();
  const screen = screenFor(route);
  const known = screen !== undefined;
  const saveError = useSaveError();

  useEffect(() => {
    if (!known) navigate(DEFAULT_PATH, { replace: true });
    else window.scrollTo(0, 0);
  }, [route, known]);

  return (
    <div className={styles.app}>
      {saveError && (
        <p role="alert" className={styles.saveError}>
          Изменения не сохранены: {saveError.message}
        </p>
      )}
      <main className={styles.main}>{screen}</main>
      <TabBar section={route[0]} />
    </div>
  );
}
