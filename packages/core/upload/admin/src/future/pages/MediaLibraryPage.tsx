import * as React from 'react';

import { Layouts, SearchInput } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';
import { GridFour as GridIcon, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { localStorageKeys, viewOptions } from '../../constants';

const ViewSwitcher = styled(Flex)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const ViewOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.neutral150 : theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes[1]};
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.neutral150 : theme.colors.neutral100};
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

import { usePersistentState } from '../../hooks/usePersistentState';
import { getTrad } from '../../utils';
import { AssetList } from '../components/AssetList/AssetList';
import { useGetAssetsQuery } from '../services/assets';

export const MediaLibraryPage = () => {
  const { formatMessage } = useIntl();
  const [sort, setSort] = React.useState<string>('updatedAt:DESC');
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const { data, isLoading, error } = useGetAssetsQuery({ folder: null, sort });

  const isGridView = view === viewOptions.GRID;

  return (
    /**
     * NOTE:
     *
     * The design differs from our current Layouts component.
     * Either we find a way to make it work with our current Layouts component
     * or we will have to write our own custom layout.
     */
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
            <ViewSwitcher>
              <ViewOption
                $active={!isGridView}
                onClick={() => setView(viewOptions.LIST)}
                aria-pressed={!isGridView}
              >
                <List />
                {formatMessage({ id: getTrad('view.table'), defaultMessage: 'Table view' })}
              </ViewOption>
              <ViewOption
                $active={isGridView}
                onClick={() => setView(viewOptions.GRID)}
                aria-pressed={isGridView}
              >
                <GridIcon />
                {formatMessage({ id: getTrad('view.grid'), defaultMessage: 'Grid view' })}
              </ViewOption>
            </ViewSwitcher>
          </Flex>
        }
      />

      <Layouts.Content>
        <AssetList
          assets={data?.results ?? []}
          pagination={data?.pagination}
          isLoading={isLoading}
          error={error}
          sort={sort}
          onSortChange={setSort}
        />
      </Layouts.Content>
    </Layouts.Root>
  );
};
