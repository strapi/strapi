import React from 'react';

import { CarouselActions, IconButton } from '@strapi/design-system';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import { Pencil, Plus, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition } from '../../../constants';
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
          icon={<Plus />}
          onClick={() => onAddAsset(asset)}
        />
      )}

      <CopyLinkButton url={prefixFileUrlWithBackendUrl(asset.url)} />

      {onDeleteAsset && (
        <IconButton
          label={formatMessage({
            id: 'global.delete',
            defaultMessage: 'Delete',
          })}
          icon={<Trash />}
          onClick={() => onDeleteAsset(asset)}
        />
      )}

      {onEditAsset && (
        <IconButton
          label={formatMessage({
            id: getTrad('control-card.edit'),
            defaultMessage: 'edit',
          })}
          icon={<Pencil />}
          onClick={onEditAsset}
        />
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
