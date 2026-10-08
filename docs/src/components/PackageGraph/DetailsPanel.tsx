import { Fragment, type ReactNode } from 'react';
import Link from '@docusaurus/Link';

import type { WorkspacePackage } from '@site/plugins/workspace-packages/types';
import StatusBadge from '@site/src/components/StatusBadge';
import { GITHUB_TREE_URL, type DocState } from '@site/src/lib/workspace-packages';

import styles from './styles.module.css';

type Props = {
  pkg: WorkspacePackage;
  groupLabel: string;
  docState: DocState;
  permalink?: string;
  dependencies: string[];
  dependents: string[];
  transitive: { dependencies: number; dependents: number };
  onFocus: (packageName: string) => void;
  onClose: () => void;
};

type RelationListProps = {
  title: string;
  names: string[];
  variant: 'dependency' | 'dependent';
  onFocus: (packageName: string) => void;
};

function RelationList({ title, names, variant, onFocus }: RelationListProps): ReactNode {
  return (
    <div className={styles.panelSection}>
      <p className={styles.panelSectionTitle}>
        <span className={styles[`legend-${variant}`]} aria-hidden="true" />
        {title} <span className={styles.panelCount}>{names.length}</span>
      </p>
      {names.length === 0 ? (
        <p className={styles.panelEmpty}>None</p>
      ) : (
        <ul className={styles.panelList}>
          {names.map((name) => (
            <li key={name}>
              <button type="button" className={styles.panelItem} onClick={() => onFocus(name)}>
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Details of the focused package, shown over the graph. */
export default function DetailsPanel({
  pkg,
  groupLabel,
  docState,
  permalink,
  dependencies,
  dependents,
  transitive,
  onFocus,
  onClose,
}: Props): ReactNode {
  return (
    <aside className={styles.panel} data-pkg-group={pkg.group} aria-label={`${pkg.name} details`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelGroup}>
          <span className={styles.swatch} aria-hidden="true" />
          {groupLabel}
        </span>
        <button
          type="button"
          className={styles.panelClose}
          onClick={onClose}
          aria-label="Clear focus"
        >
          ×
        </button>
      </div>
      <p className={styles.panelName}>
        {/* Allow line breaks after `/` and `-` only, not in the middle of a word. */}
        {pkg.name.split(/(?<=[/-])/).map((part, index) => (
          <Fragment key={index}>
            {index > 0 && <wbr />}
            {part}
          </Fragment>
        ))}
      </p>
      <div className={styles.panelTags}>
        <StatusBadge state={docState} />
        {pkg.version !== '' && <span className={styles.panelTag}>v{pkg.version}</span>}
        {pkg.private === true && <span className={styles.panelTag}>private</span>}
      </div>
      {pkg.description !== '' && <p className={styles.panelDescription}>{pkg.description}</p>}
      <p className={styles.panelTransitive}>
        Across the shown edges: {transitive.dependencies} transitive dependencies,{' '}
        {transitive.dependents} transitive dependents.
      </p>
      <RelationList
        title="Depends on"
        names={dependencies}
        variant="dependency"
        onFocus={onFocus}
      />
      <RelationList title="Used by" names={dependents} variant="dependent" onFocus={onFocus} />
      <div className={styles.panelLinks}>
        {permalink !== undefined && (
          <Link className="button button--primary button--sm" to={permalink}>
            Open package page
          </Link>
        )}
        <Link
          className="button button--secondary button--sm"
          href={`${GITHUB_TREE_URL}/${pkg.path}`}
        >
          Source
        </Link>
      </div>
    </aside>
  );
}
