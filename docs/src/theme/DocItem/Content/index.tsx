import type { ReactNode } from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type { WrapperProps } from '@docusaurus/types';
import { useDoc } from '@docusaurus/plugin-content-docs/client';

import type { DocStatus } from '@site/plugins/workspace-packages/types';
import DocStatusBanner from '@site/src/components/DocStatusBanner';
import PackageHeader from '@site/src/components/PackageHeader';

type Props = WrapperProps<typeof ContentType>;

/**
 * Renders frontmatter-driven UI around the doc content:
 * - `status` / `review_notes` -> `DocStatusBanner`, above the title.
 * - `package` -> `PackageHeader`, between the title and the Markdown content.
 *
 * `plugins/workspace-packages` validates these fields at build time (unknown `status`, malformed
 * `review_notes`, unknown `package` fail the build), so the casts below cannot be wrong.
 */
export default function ContentWrapper({ children }: Props): ReactNode {
  // `metadata.frontMatter` is the same object as `useDoc().frontMatter`, typed with an index signature.
  const { frontMatter } = useDoc().metadata;
  const status = frontMatter.status as DocStatus | undefined;
  const reviewNotes = (frontMatter.review_notes as string[] | undefined) ?? [];
  const packageName = frontMatter.package as string | undefined;

  return (
    <>
      {status !== undefined && <DocStatusBanner status={status} reviewNotes={reviewNotes} />}
      <Content>
        {packageName !== undefined && <PackageHeader name={packageName} />}
        {children}
      </Content>
    </>
  );
}
