import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetMineSpacesQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';
import { WorkspaceChip } from './WorkspaceChip';

interface SpacesOptions {
  enabled?: boolean;
  scope?: 'space' | 'platform' | 'none';
  visibleIn?: string[];
  sharedEntries?: boolean;
  sharedEditable?: boolean;
}

const optionsOf = (schema: unknown): SpacesOptions =>
  (schema as { pluginOptions?: { spaces?: SpacesOptions } })?.pluginOptions?.spaces ?? {};

/** Which workspaces a content type is available in — `[]` means every one. */
export const visibleIn = (schema: unknown): string[] => optionsOf(schema).visibleIn ?? [];

export const isEverywhere = (schema: unknown): boolean => visibleIn(schema).length === 0;

/**
 * The "Workspaces" cell of the schema index.
 *
 * A content type bound to no workspace in particular is available in all of
 * them — the platform-wide convention the binding shares with locales — so that
 * case says "All workspaces" rather than listing every one and telling you
 * nothing.
 */
export const SchemaWorkspacesCell = ({ schema }: { schema: unknown }) => {
  const { formatMessage } = useIntl();
  const { data: spaces } = useGetMineSpacesQuery();
  const slugs = visibleIn(schema);

  const shared = optionsOf(schema).sharedEntries === true;

  if (slugs.length === 0) {
    return (
      <Flex gap={2} alignItems="center">
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslation('index.workspaces.all'),
            defaultMessage: 'All workspaces',
          })}
        </Typography>
        {shared ? <SharedMark /> : null}
      </Flex>
    );
  }

  return (
    <Flex gap={1} wrap="wrap" alignItems="center">
      {slugs.map((slug) => {
        const space = spaces?.find((entry) => entry.slug === slug);
        return (
          <WorkspaceChip key={slug} space={space ? space : { slug, name: slug, color: null }} />
        );
      })}
      {shared ? <SharedMark /> : null}
    </Flex>
  );
};

/**
 * Entries shared with every workspace, said beside the workspaces rather than
 * in a column of its own — it is a fact about the same binding, and a column
 * that is empty for all but one content type earns none of its width.
 */
const SharedMark = () => {
  const { formatMessage } = useIntl();

  return (
    <Typography variant="pi" textColor="secondary600">
      {formatMessage({
        id: getTranslation('index.sharing.shared'),
        defaultMessage: 'Shared entries',
      })}
    </Typography>
  );
};
