import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import getTrad from '../../../../utils/getTrad';
import { AssetList } from '../../../AssetList';
import SortPicker from '../../../SortPicker';
import PaginationFooter from './PaginationFooter';
import PageSize from './PageSize';
import SearchAsset from './SearchAsset';
import getAllowedFiles from '../../utils/getAllowedFiles';

export const BrowseStep = ({
  allowedTypes,
  assets,
  onChangePage,
  onChangePageSize,
  onChangeSearch,
  onChangeSort,
  onClearSearch,
  onEditAsset,
  onSelectAllAsset,
  onSelectAsset,
  onSubmitSearch,
  pagination,
  queryObject,
  selectedAssets,
  searchValue,
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
          <Flex justifyContent="space-between">
            <Stack horizontal size={2}>
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
              <SortPicker onChangeSort={onChangeSort} />
            </Stack>
            <SearchAsset
              onClearSearch={onClearSearch}
              onChangeSearch={onChangeSearch}
              onSubmitSearch={onSubmitSearch}
              searchValue={searchValue}
            />
          </Flex>
        )}

        <AssetList
          allowedTypes={allowedTypes}
          size="S"
          assets={assets}
          onSelectAsset={onSelectAsset}
          selectedAssets={selectedAssets}
          onEditAsset={onEditAsset}
        />
      </Stack>
      <Flex justifyContent="space-between">
        <PageSize pageSize={queryObject.pageSize} onChangePageSize={onChangePageSize} />
        <PaginationFooter
          activePage={queryObject.page}
          onChangePage={onChangePage}
          pagination={pagination}
        />
      </Flex>
    </>
  );
};

BrowseStep.defaultProps = {
  allowedTypes: [],
  onSelectAllAsset: undefined,
};

BrowseStep.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangePageSize: PropTypes.func.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onChangeSearch: PropTypes.func.isRequired,
  onClearSearch: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  onSubmitSearch: PropTypes.func.isRequired,
  queryObject: PropTypes.shape({
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
  }).isRequired,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  searchValue: PropTypes.string.isRequired,
};
