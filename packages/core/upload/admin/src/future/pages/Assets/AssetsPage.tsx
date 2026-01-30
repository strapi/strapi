import * as React from 'react';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Layouts, SearchInput } from '@strapi/admin/strapi-admin';
import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { GridFour as GridIcon, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { localStorageKeys, viewOptions } from '../../../constants';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { getTrad } from '../../../utils';
import { useGetAssetsQuery } from '../../services/assets';

import { AssetsGrid } from './components/AssetsGrid';
import { AssetsList } from './components/AssetsList';
import { DEFAULT_SORT, type SortState } from './constants';

const StyledToggleGroup = styled(ToggleGroup.Root)`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const StyledToggleItem = styled(ToggleGroup.Item)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  border: none;
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes[1]};
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  &:hover {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &[data-state='on'] {
    background: ${({ theme }) => theme.colors.neutral150};
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

export const AssetsPage = () => {
  const { formatMessage } = useIntl();
  const [sort, setSort] = React.useState<SortState>(DEFAULT_SORT);
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const sortString = `${sort.field}:${sort.order}`;
  const { data, isLoading, error } = useGetAssetsQuery({ folder: null, sort: sortString });

  const isGridView = view === viewOptions.GRID;
  const assets = data?.results ?? [];

  return (
    <Layouts.Root>
      <Layouts.Header
        navigationAction={<Box>TODO: Breadcrumbs</Box>}
        title="TODO: Folder location"
        primaryAction={
          <Flex gap={2}>
            <SearchInput
              label={formatMessage({
                id: getTrad('search.label'),
                defaultMessage: 'Search for an asset',
              })}
              trackedEvent="didSearchMediaLibraryElements"
              trackedEventDetails={{ location: 'upload' }}
            />
            <StyledToggleGroup
              type="single"
              value={isGridView ? 'grid' : 'list'}
              onValueChange={(value) =>
                value && setView(value === 'grid' ? viewOptions.GRID : viewOptions.LIST)
              }
              aria-label={formatMessage({
                id: getTrad('view.switch.label'),
                defaultMessage: 'View options',
              })}
            >
              <StyledToggleItem
                value="list"
                aria-label={formatMessage({
                  id: getTrad('view.table'),
                  defaultMessage: 'Table view',
                })}
              >
                <List />
                {formatMessage({ id: getTrad('view.table'), defaultMessage: 'Table view' })}
              </StyledToggleItem>
              <StyledToggleItem
                value="grid"
                aria-label={formatMessage({
                  id: getTrad('view.grid'),
                  defaultMessage: 'Grid view',
                })}
              >
                <GridIcon />
                {formatMessage({ id: getTrad('view.grid'), defaultMessage: 'Grid view' })}
              </StyledToggleItem>
            </StyledToggleGroup>
          </Flex>
        }
      />

      <Layouts.Content>
        {isLoading ? (
          <Flex justifyContent="center" padding={8}>
            <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
          </Flex>
        ) : error ? (
          <Box padding={8}>
            <Typography textColor="danger600">
              {formatMessage({
                id: getTrad('list.assets.error'),
                defaultMessage: 'An error occurred while fetching assets.',
              })}
            </Typography>
          </Box>
        ) : isGridView ? (
          <AssetsGrid assets={assets} />
        ) : (
          <AssetsList assets={assets} sort={sort} onSortChange={setSort} />
        )}
      </Layouts.Content>
    </Layouts.Root>
  );
};
