import React from 'react';

import { CarouselActions, IconButton } from '@strapi/design-system';
import { Pencil, Plus, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition } from '../../../constants';
import { prefixFileUrlWithBackendUrl } from '../../../utils';
import getTrad from '../../../utils/getTrad';
import { CopyLinkButton } from '../../CopyLinkButton';

export const CarouselAssetActions = ({ asset, onDeleteAsset, onAddAsset, onEditAsset }) => {
  const { formatMessage } = useIntl();

  return (
    <CarouselActions>
      {onAddAsset && (
        <IconButton
          label={formatMessage({
            id: getTrad('control-card.add'),
            defaultMessage: 'Add',
          })}
          onClick={() => onAddAsset(asset)}
        >
          <Plus />
        </IconButton>
      )}

      <CopyLinkButton url={prefixFileUrlWithBackendUrl(asset.url)} />

      {onDeleteAsset && (
        <IconButton
          label={formatMessage({
            id: 'global.delete',
            defaultMessage: 'Delete',
          })}
          onClick={() => onDeleteAsset(asset)}
        >
          <Trash />
        </IconButton>
      )}

      {onEditAsset && (
        <IconButton
          label={formatMessage({
            id: getTrad('control-card.edit'),
            defaultMessage: 'edit',
          })}
          onClick={onEditAsset}
        >
          <Pencil />
        </IconButton>
      )}
    </CarouselActions>
  );
};

CarouselAssetActions.defaultProps = {
  onAddAsset: undefined,
  onDeleteAsset: undefined,
  onEditAsset: undefined,
};

CarouselAssetActions.propTypes = {
  asset: AssetDefinition.isRequired,
  onAddAsset: PropTypes.func,
  onEditAsset: PropTypes.func,
  onDeleteAsset: PropTypes.func,
};
