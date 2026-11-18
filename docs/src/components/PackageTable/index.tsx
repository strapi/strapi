import type { ReactNode } from 'react';
import Heading from '@theme/Heading';

import PackageLink from '@site/src/components/PackageLink';
import StatusBadge from '@site/src/components/StatusBadge';
import {
  getPackageDocState,
  getPackageSections,
  useWorkspacePackages,
} from '@site/src/lib/workspace-packages';

import styles from './styles.module.css';

const countBy = (names: string[]): Map<string, number> => {
  const counts = new Map<string, number>();

  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));

  return counts;
};

/** Server-rendered list of every workspace package, grouped by folder. */
export default function PackageTable(): ReactNode {
  const data = useWorkspacePackages();
  const prodEdges = data.edges.filter((edge) => edge.kind === 'prod');
  const dependencyCounts = countBy(prodEdges.map((edge) => edge.source));
  const dependentCounts = countBy(prodEdges.map((edge) => edge.target));

  return (
    <div>
      {getPackageSections(data).map(({ group, packages }) => (
        <section key={group.id} data-pkg-group={group.id}>
          <Heading as="h3" id={`packages-${group.id}`} className={styles.groupHeading}>
            <span className={styles.swatch} aria-hidden="true" />
            {group.label}
            <span className={styles.groupCount}>{packages.length}</span>
          </Heading>
          <div className={styles.scroll}>
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Description</th>
                  <th>Docs</th>
                  <th className={styles.number} title="Internal production dependencies">
                    Deps
                  </th>
                  <th
                    className={styles.number}
                    title="Internal packages depending on it (production)"
                  >
                    Used by
                  </th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.name}>
                    <td className={styles.name}>
                      <PackageLink name={pkg.name} />
                      {pkg.private === true && <span className={styles.private}>private</span>}
                      <span className={styles.path}>{pkg.path}</span>
                    </td>
                    <td className={styles.description}>{pkg.description}</td>
                    <td>
                      <StatusBadge state={getPackageDocState(data, pkg.name)} />
                    </td>
                    <td className={styles.number}>{dependencyCounts.get(pkg.name) ?? 0}</td>
                    <td className={styles.number}>{dependentCounts.get(pkg.name) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
