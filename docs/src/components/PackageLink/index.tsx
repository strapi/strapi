import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';

import { useWorkspacePackages } from '@site/src/lib/workspace-packages';

type Props = {
  name: string;
  className?: string;
};

/** Links a package name to its doc page, or renders it as plain code when it has none. */
export default function PackageLink({ name, className }: Props): ReactNode {
  const { packageDocs } = useWorkspacePackages();
  const doc = packageDocs[name];

  if (doc === undefined) {
    return <code className={className}>{name}</code>;
  }

  return (
    <Link className={className} to={doc.permalink}>
      <code>{name}</code>
    </Link>
  );
}
