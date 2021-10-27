import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { AssetList } from '../../../AssetList';
import getTrad from '../../../../utils/getTrad';

export const SelectedStep = ({ selectedAssets, onSelectAsset }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack size={4}>
      <Stack size={0}>
        <Text small bold textColor="neutral800">
          {formatMessage(
            {
              id: getTrad('list.assets.selected'),
              defaultMessage:
                '{number, plural, =0 {No asset} one {1 asset} other {# assets}} selected',
            },
            { number: selectedAssets.length }
          )}
        </Text>
        <Text small textColor="neutral600">
          {formatMessage({
            id: getTrad('modal.upload-list.sub-header-subtitle'),
            defaultMessage: 'Manage the assets before adding them to the Media Library',
          })}
        </Text>
      </Stack>

      <AssetList
        size="S"
        assets={selectedAssets}
        onSelectAsset={onSelectAsset}
        selectedAssets={selectedAssets}
        onEditAsset={() => {}}
      />
    </Stack>
  );
};

SelectedStep.propTypes = {
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
