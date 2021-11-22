import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import EmptyPicturesIcon from '@strapi/icons/EmptyPictures';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import styled from 'styled-components';
import getTrad from '../../../utils/getTrad';
import getAllowedFiles from '../../../utils/getAllowedFiles';
import { AssetList } from '../../AssetList';
import { EmptyAssets } from '../../EmptyAssets';
import { Filters } from './Filters';
import PaginationFooter from './PaginationFooter';
import PageSize from './PageSize';
import SearchAsset from './SearchAsset';
import SortPicker from '../../SortPicker';

const StartBlockActions = styled(Flex)`
  & > * + * {
    margin-left: ${({ theme }) => theme.spaces[2]};
  }

  margin-left: ${({ pullRight }) => (pullRight ? 'auto' : undefined)};
`;

const EndBlockActions = styled(StartBlockActions)`
  flex-shrink: 0;
`;

export const BrowseStep = ({
  allowedTypes,
  assets,
  multiple,
  onChangeFilters,
  onChangePage,
  onChangePageSize,
  onChangeSearch,
  onChangeSort,
  onEditAsset,
  onSelectAllAsset,
  onSelectAsset,
  pagination,
  queryObject,
  selectedAssets,
}) => {
  const { formatMessage } = useIntl();
  const allAllowedAsset = getAllowedFiles(allowedTypes, assets);
  const areAllAssetSelected =
    allAllowedAsset.every(
      asset => selectedAssets.findIndex(currAsset => currAsset.id === asset.id) !== -1
    ) && selectedAssets.length > 0;
  const hasSomeAssetSelected = allAllowedAsset.some(
    asset => selectedAssets.findIndex(currAsset => currAsset.id === asset.id) !== -1
  );

  return (
    <>
      <Stack size={4}>
        {onSelectAllAsset && (
          <Box>
            <Box paddingBottom={4}>
              <Flex justifyContent="space-between" alignItems="flex-start">
                <StartBlockActions wrap="wrap">
                  {multiple && (
                    <Flex
                      paddingLeft={2}
                      paddingRight={2}
                      background="neutral0"
                      hasRadius
                      borderColor="neutral200"
                      height={`${32 / 16}rem`}
                    >
                      <BaseCheckbox
                        aria-label={formatMessage({
                          id: getTrad('bulk.select.label'),
                          defaultMessage: 'Select all assets',
                        })}
                        indeterminate={!areAllAssetSelected && hasSomeAssetSelected}
                        value={areAllAssetSelected}
                        onChange={onSelectAllAsset}
                      />
                    </Flex>
                  )}
                  <SortPicker onChangeSort={onChangeSort} />
                  <Filters
                    appliedFilters={queryObject.filters.$and}
                    onChangeFilters={onChangeFilters}
                  />
                </StartBlockActions>
                <EndBlockActions pullRight>
                  <SearchAsset onChangeSearch={onChangeSearch} queryValue={queryObject._q || ''} />
                </EndBlockActions>
              </Flex>
            </Box>
          </Box>
        )}

        {assets.length > 0 ? (
          <AssetList
            allowedTypes={allowedTypes}
            size="S"
            assets={assets}
            onSelectAsset={onSelectAsset}
            selectedAssets={selectedAssets}
            onEditAsset={onEditAsset}
          />
        ) : (
          <Box paddingBottom={6}>
            <EmptyAssets
              icon={EmptyPicturesIcon}
              size="S"
              count={6}
              content={formatMessage({
                id: getTrad('list.assets-empty.search'),
                defaultMessage: 'No result found',
              })}
            />
          </Box>
        )}
      </Stack>
      {pagination.pageCount > 0 && (
        <Flex justifyContent="space-between">
          <PageSize pageSize={queryObject.pageSize} onChangePageSize={onChangePageSize} />
          <PaginationFooter
            activePage={queryObject.page}
            onChangePage={onChangePage}
            pagination={pagination}
          />
        </Flex>
      )}
    </>
  );
};

BrowseStep.defaultProps = {
  allowedTypes: [],
  multiple: false,
  onSelectAllAsset: undefined,
  onEditAsset: undefined,
};

BrowseStep.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  multiple: PropTypes.bool,
  onChangeFilters: PropTypes.func.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangePageSize: PropTypes.func.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onChangeSearch: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  queryObject: PropTypes.shape({
    filters: PropTypes.object,
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    _q: PropTypes.string,
  }).isRequired,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
