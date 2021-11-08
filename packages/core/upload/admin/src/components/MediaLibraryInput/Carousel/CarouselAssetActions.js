import React from 'react';
import PropTypes from 'prop-types';
import { CarouselActions } from '@strapi/design-system/Carousel';
import { IconButton } from '@strapi/design-system/IconButton';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import PlusIcon from '@strapi/icons/Plus';
import TrashIcon from '@strapi/icons/Trash';
import PencilIcon from '@strapi/icons/Pencil';
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
          icon={<PlusIcon />}
          onClick={() => onAddAsset(asset)}
        />
      )}

      <CopyLinkButton url={prefixFileUrlWithBackendUrl(asset.url)} />

      {onDeleteAsset && (
        <IconButton
          label={formatMessage({
            id: getTrad('app.utils.delete'),
            defaultMessage: 'Delete',
          })}
          icon={<TrashIcon />}
          onClick={() => onDeleteAsset(asset)}
        />
      )}

      {onEditAsset && (
        <IconButton
          label={formatMessage({
            id: getTrad('app.utils.edit'),
            defaultMessage: 'edit',
          })}
          icon={<PencilIcon />}
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
