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

  if (slugs.length === 0) {
    return (
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslation('index.workspaces.all'),
          defaultMessage: 'All workspaces',
        })}
      </Typography>
    );
  }

  return (
    <Flex gap={1} wrap="wrap">
      {slugs.map((slug) => {
        const space = spaces?.find((entry) => entry.slug === slug);
        return (
          <WorkspaceChip key={slug} space={space ? space : { slug, name: slug, color: null }} />
        );
      })}
    </Flex>
  );
};

/**
 * "Shared" as a column of its own: whether entries of this type belong to every
 * workspace at once, which is a different question from where the *type* is
 * available and the one that surprises people.
 */
export const SchemaSharingCell = ({ schema }: { schema: unknown }) => {
  const { formatMessage } = useIntl();
  const options = optionsOf(schema);

  if (!options.sharedEntries) {
    return <Typography textColor="neutral400">—</Typography>;
  }

  return (
    <Typography textColor="secondary600" fontWeight="bold">
      {options.sharedEditable
        ? formatMessage({
            id: getTranslation('index.sharing.editable'),
            defaultMessage: 'Shared, editable',
          })
        : formatMessage({ id: getTranslation('index.sharing.shared'), defaultMessage: 'Shared' })}
    </Typography>
  );
};
