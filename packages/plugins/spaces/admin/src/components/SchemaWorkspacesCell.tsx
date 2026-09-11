import { Flex, Menu, Typography } from '@strapi/design-system';
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
 *
 * The rest say how many and hold the names behind a click, the way the Content
 * Manager's relations do: a column of chips is unreadable at a glance and grows
 * with the number of workspaces, which is the number that will grow.
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

  const spaceFor = (slug: string) =>
    spaces?.find((entry) => entry.slug === slug) ?? { slug, name: slug, color: null };

  return (
    <Flex gap={2} alignItems="center">
      <Menu.Root>
        <Menu.Trigger onClick={(e) => e.stopPropagation()}>
          <Typography style={{ cursor: 'pointer' }} textColor="neutral800">
            {formatMessage(
              {
                id: getTranslation('index.workspaces.count'),
                defaultMessage: '{count, plural, one {# workspace} other {# workspaces}}',
              },
              { count: slugs.length }
            )}
          </Typography>
        </Menu.Trigger>
        <Menu.Content>
          {slugs.map((slug) => (
            <Menu.Item key={slug} disabled onSelect={() => {}}>
              <WorkspaceChip space={spaceFor(slug)} />
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
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
