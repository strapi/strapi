import { SchemaOption } from '@strapi/content-type-builder/strapi-admin';
import { Flex, Menu, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetMineSpacesQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';

interface SpacesOptions {
  enabled?: boolean;
  scope?: 'space' | 'platform' | 'none';
  visibleIn?: string[];
  sharedEntries?: boolean;
  sharedEditable?: boolean;
}

/**
 * Every cell in the column is this tall, whether it holds a button or a word.
 *
 * The trigger is a control and stands taller than text; without this, the one
 * row with a dropdown in it was taller than every other row in the table.
 */
const Cell = styled(Flex)`
  height: 3.2rem;
`;

/**
 * The count sits in a dropdown and the other rows say "All workspaces" in
 * plain text. The trigger keeps its padding — it is a button and needs to look
 * like one — and is pulled back by exactly that padding, so the count starts
 * where the words above and below it start.
 */
const FlushTrigger = styled(Menu.Trigger)`
  height: 3.2rem;
  margin-left: calc(-1 * (${({ theme }) => theme.spaces[2]} - 2px + 1px));
`;

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

  if (slugs.length === 0) {
    return (
      <Cell alignItems="center">
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslation('index.workspaces.all'),
            defaultMessage: 'All workspaces',
          })}
        </Typography>
      </Cell>
    );
  }

  const nameFor = (slug: string) => spaces?.find((entry) => entry.slug === slug)?.name ?? slug;

  return (
    <Cell alignItems="center">
      <Menu.Root>
        <FlushTrigger onClick={(e) => e.stopPropagation()}>
          <Typography style={{ cursor: 'pointer' }} textColor="neutral800">
            {formatMessage(
              {
                id: getTranslation('index.workspaces.count'),
                defaultMessage: '{count, plural, one {# workspace} other {# workspaces}}',
              },
              { count: slugs.length }
            )}
          </Typography>
        </FlushTrigger>
        <Menu.Content>
          {slugs.map((slug) => (
            <Menu.Item key={slug} disabled onSelect={() => {}}>
              <Typography textColor="neutral800">{nameFor(slug)}</Typography>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
    </Cell>
  );
};

/**
 * Whether every entry of this content type is shared with every workspace — a
 * column of its own, reading the way the builder's other yes-or-no options do.
 */
export const SchemaSharingCell = ({ schema }: { schema: unknown }) => (
  <SchemaOption on={optionsOf(schema).sharedEntries === true} />
);
