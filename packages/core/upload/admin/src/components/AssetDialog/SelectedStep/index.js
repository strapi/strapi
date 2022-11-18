import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Stack, Typography } from '@strapi/design-system';
import { AssetList } from '../../AssetList';
import getTrad from '../../../utils/getTrad';

export const SelectedStep = ({ selectedAssets, onSelectAsset, onReorderAsset }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack spacing={4}>
      <Stack spacing={0}>
        <Typography variant="pi" fontWeight="bold" textColor="neutral800">
          {formatMessage(
            {
              id: getTrad('list.assets.to-upload'),
              defaultMessage:
                '{number, plural, =0 {No asset} one {1 asset} other {# assets}} ready to upload',
            },
            { number: selectedAssets.length }
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTrad('modal.upload-list.sub-header-subtitle'),
            defaultMessage: 'Manage the assets before adding them to the Media Library',
          })}
        </Typography>
      </Stack>

      <AssetList
        size="S"
        assets={selectedAssets}
        onSelectAsset={onSelectAsset}
        selectedAssets={selectedAssets}
        onReorderAsset={onReorderAsset}
      />
    </Stack>
  );
};

SelectedStep.defaultProps = {
  onReorderAsset: undefined,
};

SelectedStep.propTypes = {
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onReorderAsset: PropTypes.func,
};
