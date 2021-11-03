import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { AssetList } from '../../../AssetList';
import getTrad from '../../../../utils/getTrad';
import PaginationFooter from './PaginationFooter';
import PageSize from './PageSize';
import SortPicker from '../../../SortPicker';

export const BrowseStep = ({
  assets,
  onChangePage,
  onChangePageSize,
  onChangeSort,
  onEditAsset,
  onSelectAllAsset,
  onSelectAsset,
  pagination,
  queryObject,
  selectedAssets,
}) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Stack size={4}>
        {onSelectAllAsset && (
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
                value={assets?.length > 0 && selectedAssets.length === assets?.length}
                onChange={onSelectAllAsset}
              />
            </Flex>
            <SortPicker onChangeSort={onChangeSort} />
          </Stack>
        )}

        <AssetList
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
  onSelectAllAsset: undefined,
};

BrowseStep.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangePageSize: PropTypes.func.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  queryObject: PropTypes.shape({
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
  }).isRequired,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
