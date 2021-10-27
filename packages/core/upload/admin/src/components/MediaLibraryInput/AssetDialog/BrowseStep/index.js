import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/parts/Flex';
import { Stack } from '@strapi/parts/Stack';
import { BaseCheckbox } from '@strapi/parts/BaseCheckbox';
import { AssetList } from '../../../AssetList';
import getTrad from '../../../../utils/getTrad';

export const BrowseStep = ({
  assets,
  onEditAsset,
  onSelectAsset,
  onSelectAllAsset,
  selectedAssets,
}) => {
  const { formatMessage } = useIntl();

  return (
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
  );
};

BrowseStep.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
