import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import type { DocStatus } from '@site/plugins/workspace-packages/types';
import PackageLink from '@site/src/components/PackageLink';
import StatusBadge from '@site/src/components/StatusBadge';
import {
  DOC_STATE_LABELS,
  getPackageDocState,
  isPackageDocumented,
  useWorkspacePackages,
} from '@site/src/lib/workspace-packages';

import styles from './styles.module.css';

/** Most actionable first. Pages come title-sorted from the plugin; the sort below is stable. */
const STATUS_ORDER: DocStatus[] = ['needs-review', 'draft', 'stub'];

/** Report of the pages flagged with `status` frontmatter and of the package docs coverage. */
export default function DocsHealth(): ReactNode {
  const data = useWorkspacePackages();
  const flaggedDocs = [...data.docs].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
  const uncoveredPackages = data.packages
    .filter((pkg) => isPackageDocumented(data, pkg.name) === false)
    .map((pkg) => ({ pkg, state: getPackageDocState(data, pkg.name) }))
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name, 'en'));
  const documentedCount = data.packages.length - uncoveredPackages.length;

  return (
    <div>
      <dl className={styles.stats}>
        {STATUS_ORDER.map((status) => (
          <div key={status} className={styles.stat}>
            <dt>
              <StatusBadge state={status} />
            </dt>
            <dd>
              <span className={styles.statValue}>
                {data.docs.filter((doc) => doc.status === status).length}
              </span>{' '}
              pages
            </dd>
          </div>
        ))}
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Documented packages</dt>
          <dd>
            <span className={styles.statValue}>{documentedCount}</span> of {data.packages.length}
          </dd>
        </div>
      </dl>

      <Heading as="h2" id="flagged-pages">
        Flagged pages
      </Heading>
      {flaggedDocs.length === 0 ? (
        <p>No page is flagged.</p>
      ) : (
        <div className={styles.scroll}>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Status</th>
                <th>Review notes</th>
              </tr>
            </thead>
            <tbody>
              {flaggedDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <Link to={doc.permalink}>{doc.title}</Link>
                  </td>
                  <td>
                    <StatusBadge state={doc.status} />
                  </td>
                  <td>
                    {doc.reviewNotes.length === 0 ? (
                      <span className={styles.muted}>None</span>
                    ) : (
                      <ul className={styles.notes}>
                        {doc.reviewNotes.map((note, index) => (
                          <li key={`${index}-${note}`}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Heading as="h2" id="package-coverage">
        Packages without real docs
      </Heading>
      <p>
        Workspace packages whose page is missing or marked{' '}
        <strong>{DOC_STATE_LABELS.stub.toLowerCase()}</strong>.
      </p>
      {uncoveredPackages.length === 0 ? (
        <p>Every package has a documented page.</p>
      ) : (
        <ul className={styles.packages}>
          {uncoveredPackages.map(({ pkg, state }) => (
            <li key={pkg.name}>
              <PackageLink name={pkg.name} />
              <StatusBadge state={state} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
