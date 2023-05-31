import React from 'react';
import PropTypes from 'prop-types';
import { CarouselActions, IconButton } from '@strapi/design-system';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Plus, Trash, Pencil } from '@strapi/icons';
import getTrad from '../../../utils/getTrad';
import { CopyLinkButton } from '../../CopyLinkButton';
import { AssetDefinition } from '../../../constants';

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
