import { href } from '../../router';
import styles from './AccountScreen.module.css';

export function BackLink() {
  return (
    <a className={styles.back} href={href('/plan')}>
      ← План
    </a>
  );
}
