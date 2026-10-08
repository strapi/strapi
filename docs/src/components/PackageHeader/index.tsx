import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';

import type { DependencyKind } from '@site/plugins/workspace-packages/types';
import PackageLink from '@site/src/components/PackageLink';
import {
  GITHUB_TREE_URL,
  getDependencies,
  getDependents,
  getPackageMapUrl,
  useWorkspacePackages,
} from '@site/src/lib/workspace-packages';

import styles from './styles.module.css';

type Props = {
  /** npm name of a workspace package, from the doc `package` frontmatter. */
  name: string;
};

type RelationsProps = {
  title: string;
  byKind: Record<DependencyKind, string[]>;
};

const SECONDARY_KINDS: Array<{ kind: DependencyKind; label: string }> = [
  { kind: 'dev', label: 'Dev' },
  { kind: 'peer', label: 'Peer' },
];

function Relations({ title, byKind }: RelationsProps): ReactNode {
  return (
    <div className={styles.relations}>
      <p className={styles.relationsTitle}>
        {title} <span className={styles.count}>{byKind.prod.length}</span>
      </p>
      {byKind.prod.length === 0 ? (
        <p className={styles.empty}>No internal production dependency.</p>
      ) : (
        <ul className={styles.chips}>
          {byKind.prod.map((name) => (
            <li key={name}>
              <PackageLink name={name} className={styles.chip} />
            </li>
          ))}
        </ul>
      )}
      {SECONDARY_KINDS.filter(({ kind }) => byKind[kind].length > 0).map(({ kind, label }) => (
        <p key={kind} className={styles.secondary}>
          <span className={styles.secondaryLabel}>{label}</span>
          {byKind[kind].map((name) => (
            <PackageLink key={name} name={name} className={styles.secondaryItem} />
          ))}
        </p>
      ))}
    </div>
  );
}

export default function PackageHeader({ name }: Props): ReactNode {
  const data = useWorkspacePackages();
  const pkg = data.packages.find((candidate) => candidate.name === name);

  // The plugin fails the build on unknown `package` values, so this only guards stale dev data.
  if (pkg === undefined) {
    return null;
  }

  const group = data.groups.find((candidate) => candidate.id === pkg.group);
  const dependencies: Record<DependencyKind, string[]> = {
    prod: getDependencies(data.edges, name, 'prod'),
    dev: getDependencies(data.edges, name, 'dev'),
    peer: getDependencies(data.edges, name, 'peer'),
  };
  const dependents: Record<DependencyKind, string[]> = {
    prod: getDependents(data.edges, name, 'prod'),
    dev: getDependents(data.edges, name, 'dev'),
    peer: getDependents(data.edges, name, 'peer'),
  };

  return (
    <section
      // `package-header` is a stable class for the search index to ignore, see `docusaurus.config.ts`.
      className={clsx('package-header', styles.header)}
      data-pkg-group={pkg.group}
      aria-label="Package details"
    >
      <div className={styles.meta}>
        <span className={styles.group}>{group?.label ?? pkg.group}</span>
        <code className={styles.name}>{pkg.name}</code>
        {pkg.version !== '' && <span className={styles.tag}>v{pkg.version}</span>}
        {pkg.private === true && (
          <span className={clsx(styles.tag, styles.private)} title="Not published to npm">
            private
          </span>
        )}
        <Link className={styles.source} href={`${GITHUB_TREE_URL}/${pkg.path}`}>
          {pkg.path}
        </Link>
      </div>
      {pkg.description !== '' && <p className={styles.description}>{pkg.description}</p>}
      <div className={styles.grid}>
        <Relations title="Depends on" byKind={dependencies} />
        <Relations title="Used by" byKind={dependents} />
      </div>
      <Link className={styles.mapLink} to={getPackageMapUrl(pkg.name)}>
        View in package map →
      </Link>
    </section>
  );
}
