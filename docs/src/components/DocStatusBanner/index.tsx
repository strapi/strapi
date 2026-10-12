import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';

import type { DocStatus } from '@site/plugins/workspace-packages/types';
import { DOCS_HEALTH_PATH } from '@site/src/lib/workspace-packages';

import styles from './styles.module.css';

type Props = {
  status: DocStatus;
  reviewNotes: string[];
};

const STATUS_CONTENT: Record<DocStatus, { title: string; body: string; alertClass: string }> = {
  stub: {
    title: 'This page is a stub',
    body: 'It only has headings so far. Contributions are welcome.',
    alertClass: 'alert--secondary',
  },
  draft: {
    title: 'Draft, not yet verified against the code',
    body: 'The content may be incomplete. Check it against the source before relying on it.',
    alertClass: 'alert--info',
  },
  'needs-review': {
    title: 'Needs review, may be outdated',
    body: 'Parts of this page are suspected to be stale.',
    alertClass: 'alert--warning',
  },
};

export default function DocStatusBanner({ status, reviewNotes }: Props): ReactNode {
  const content = STATUS_CONTENT[status];

  return (
    <aside className={clsx('alert', content.alertClass, styles.banner)} role="note">
      <p className={styles.title}>{content.title}</p>
      <p className={styles.body}>{content.body}</p>
      {reviewNotes.length > 0 && (
        <ul className={styles.notes}>
          {reviewNotes.map((note, index) => (
            <li key={`${index}-${note}`}>{note}</li>
          ))}
        </ul>
      )}
      <Link className={styles.link} to={DOCS_HEALTH_PATH}>
        See all flagged pages in Docs health
      </Link>
    </aside>
  );
}
