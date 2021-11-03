import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { AssetList } from '../../../AssetList';
import getTrad from '../../../../utils/getTrad';
import PageSize from './PageSize';

export const BrowseStep = ({
  assets,
  onChangePageSize,
  onEditAsset,
  onSelectAllAsset,
  onSelectAsset,
  pageSize,
  selectedAssets,
}) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Stack size={4}>
        {onSelectAllAsset && (
          <Flex>
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
          </Flex>
        )}

        <AssetList
          size="S"
          assets={assets}
          onSelectAsset={onSelectAsset}
          selectedAssets={selectedAssets}
          onEditAsset={onEditAsset}
        />
      </Stack>
      <Flex>
        <PageSize pageSize={pageSize} onChangePageSize={onChangePageSize} />
      </Flex>
    </>
  );
};

BrowseStep.defaultProps = {
  onSelectAllAsset: undefined,
};

BrowseStep.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onChangePageSize: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  pageSize: PropTypes.number.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
