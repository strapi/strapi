import * as React from 'react';

import {
  Box,
  Breadcrumbs,
  Crumb,
  CrumbLink,
  Flex,
  IconButton,
  Popover,
  Typography,
  useCollator,
  useFilter,
} from '@strapi/design-system';
import { CaretDown, Check } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';

import type { Component, ContentType } from '../../types';

type Schema = ContentType | Component;
type Kind = 'collectionType' | 'singleType' | 'component';

const KIND_LABELS: Record<Kind, { id: string; defaultMessage: string }> = {
  collectionType: { id: getTrad('index.tab.collectionTypes'), defaultMessage: 'Collection types' },
  singleType: { id: getTrad('index.tab.singleTypes'), defaultMessage: 'Single types' },
  component: { id: getTrad('index.tab.components'), defaultMessage: 'Components' },
};

const kindOf = (schema: Schema): Kind =>
  schema.modelType === 'component'
    ? 'component'
    : (((schema as { kind?: string }).kind as Kind) ?? 'collectionType');

const pathTo = (schema: Schema): string =>
  schema.modelType === 'component'
    ? `/plugins/${pluginId}/component-categories/${
        (schema as { category?: string }).category
      }/${schema.uid}`
    : `/plugins/${pluginId}/content-types/${schema.uid}`;

const SearchInput = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: ${({ theme }) => theme.fontSizes[2]};

  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Option = styled(Flex)`
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.primary100};
  }
`;

/**
 * Where you are, and the way to anywhere else.
 *
 * The builder used to keep a list of every schema down the side of every page,
 * which spent a column of the screen on a question you ask for a second at a
 * time. The breadcrumb says the same thing in a line — the kind, linking back
 * to the index filtered to it, then this schema — and the caret beside it opens
 * the list, searchable, for the moment you actually want it.
 *
 * Every kind is in the list, not just this one's siblings: hopping from a
 * collection type to the component it embeds is the move people make, and
 * sending them through the index to do it is the sidebar's job all over again.
 */
export const SchemaSwitcher = ({ current }: { current: Schema }) => {
  const { formatMessage, locale } = useIntl();
  const navigate = useNavigate();
  const { contentTypes, components } = useDataManager();
  const { contains } = useFilter(locale, { sensitivity: 'base' });
  const formatter = useCollator(locale, { sensitivity: 'base' });

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const groups = React.useMemo(() => {
    const all = [
      ...Object.values(contentTypes).filter((type) => type.visible),
      ...Object.values(components),
    ] as Schema[];

    const matching = all.filter(
      (schema) =>
        search.length === 0 ||
        contains(schema.info.displayName, search) ||
        contains(schema.uid, search)
    );

    return (['collectionType', 'singleType', 'component'] as Kind[])
      .map((kind) => ({
        kind,
        schemas: matching
          .filter((schema) => kindOf(schema) === kind)
          .sort((a, b) => formatter.compare(a.info.displayName, b.info.displayName)),
      }))
      .filter((group) => group.schemas.length > 0);
  }, [contentTypes, components, search, contains, formatter]);

  const kind = kindOf(current);

  const go = (schema: Schema) => {
    setOpen(false);
    setSearch('');
    navigate(pathTo(schema));
  };

  return (
    <Flex gap={1} alignItems="center">
      <Breadcrumbs label={upperFirst(current.info.displayName)}>
        <CrumbLink
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - `tag` is not in BaseLinkProps, the media library does the same
          tag={ReactRouterLink}
          to={`/plugins/${pluginId}?kind=${kind}`}
        >
          {formatMessage(KIND_LABELS[kind])}
        </CrumbLink>
        <Crumb isCurrent>{upperFirst(current.info.displayName)}</Crumb>
      </Breadcrumbs>

      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSearch('');
          }
        }}
      >
        <Popover.Trigger>
          <IconButton
            variant="ghost"
            size="XS"
            label={formatMessage({
              id: getTrad('switcher.open'),
              defaultMessage: 'Go to another content type or component',
            })}
          >
            <CaretDown />
          </IconButton>
        </Popover.Trigger>
        <Popover.Content align="start" sideOffset={4}>
          <Box width="28rem" padding={2}>
            <Box
              paddingLeft={3}
              paddingRight={3}
              paddingTop={2}
              paddingBottom={2}
              marginBottom={2}
              background="neutral100"
              hasRadius
            >
              <SearchInput
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={formatMessage({
                  id: getTrad('switcher.search'),
                  defaultMessage: 'Search content types and components',
                })}
                placeholder={formatMessage({
                  id: getTrad('switcher.search.placeholder'),
                  defaultMessage: 'Search…',
                })}
              />
            </Box>

            <Box maxHeight="32rem" overflow="auto">
              {groups.length === 0 ? (
                <Box padding={3}>
                  <Typography textColor="neutral600">
                    {formatMessage({
                      id: getTrad('switcher.empty'),
                      defaultMessage: 'Nothing matches that.',
                    })}
                  </Typography>
                </Box>
              ) : (
                groups.map((group) => (
                  <Box key={group.kind} paddingBottom={2}>
                    <Box paddingLeft={3} paddingRight={3} paddingBottom={1}>
                      <Typography variant="sigma" textColor="neutral600">
                        {formatMessage(KIND_LABELS[group.kind])}
                      </Typography>
                    </Box>
                    <Flex direction="column" alignItems="stretch" tag="ul">
                      {group.schemas.map((schema) => (
                        <li key={schema.uid}>
                          <Option
                            tag="button"
                            type="button"
                            onClick={() => go(schema)}
                            justifyContent="space-between"
                            gap={2}
                            hasRadius
                            paddingLeft={3}
                            paddingRight={3}
                            paddingTop={2}
                            paddingBottom={2}
                          >
                            <Typography
                              textColor="neutral800"
                              fontWeight={schema.uid === current.uid ? 'bold' : 'regular'}
                            >
                              {upperFirst(schema.info.displayName)}
                            </Typography>
                            {schema.uid === current.uid ? (
                              <Check fill="primary600" width="1.2rem" height="1.2rem" />
                            ) : null}
                          </Option>
                        </li>
                      ))}
                    </Flex>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Popover.Content>
      </Popover.Root>
    </Flex>
  );
};
