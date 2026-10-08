import type { ReactNode } from 'react';
import clsx from 'clsx';

import { DOC_STATE_LABELS, type DocState } from '@site/src/lib/workspace-packages';

import styles from './styles.module.css';

type Props = {
  state: DocState;
  className?: string;
};

export default function StatusBadge({ state, className }: Props): ReactNode {
  return (
    <span className={clsx(styles.badge, styles[state], className)}>{DOC_STATE_LABELS[state]}</span>
  );
}
