import { href } from '../router';
import styles from './TabBar.module.css';

const TABS = [
  { section: 'paycheck', path: '/paycheck', label: 'Получка' },
  { section: 'history', path: '/history', label: 'История' },
  { section: 'plan', path: '/plan', label: 'План' },
  { section: 'mortgage', path: '/mortgage', label: 'Ипотека' },
  { section: 'settings', path: '/settings', label: 'Настройки' },
];

/** Нижняя панель вкладок; `section` — первый сегмент маршрута. */
export function TabBar({ section }: { section: string | undefined }) {
  return (
    <nav className={styles.tabBar} aria-label="Разделы">
      {TABS.map((tab) => (
        <a
          key={tab.section}
          href={href(tab.path)}
          className={styles.tab}
          aria-current={tab.section === section ? 'page' : undefined}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
