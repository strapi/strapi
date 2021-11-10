import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Icon } from '@strapi/design-system/Icon';
import EmptyPicturesIcon from '@strapi/icons/EmptyPictures';
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
  multiple,
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
          <Flex justifyContent="space-between">
            <Stack horizontal size={2}>
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
            </Stack>
            <SearchAsset onChangeSearch={onChangeSearch} queryValue={queryObject._q || ''} />
          </Flex>
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
          <Flex justifyContent="center" direction="column" paddingTop={8} paddingBottom={8}>
            <Icon as={EmptyPicturesIcon} height="114px" width="216px" color="" marginBottom={6} />
            <Typography variant="delta" textColor="neutral600">
              {formatMessage({
                id: getTrad('list.assets-empty.search'),
                defaultMessage: 'No result found',
              })}
            </Typography>
          </Flex>
        )}
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
  multiple: false,
  onSelectAllAsset: undefined,
  onEditAsset: undefined,
};

BrowseStep.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  multiple: PropTypes.bool,
  onChangePage: PropTypes.func.isRequired,
  onChangePageSize: PropTypes.func.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onChangeSearch: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  queryObject: PropTypes.shape({
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    _q: PropTypes.string,
  }).isRequired,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
