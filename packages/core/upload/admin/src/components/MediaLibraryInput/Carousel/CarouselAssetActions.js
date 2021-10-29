import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { CarouselActions } from '@strapi/parts/Carousel';
import { IconButton } from '@strapi/parts/IconButton';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import AddIcon from '@strapi/icons/AddIcon';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import EditIcon from '@strapi/icons/EditIcon';
import getTrad from '../../../utils/getTrad';
import { CopyLinkButton } from '../../CopyLinkButton';
import { AssetDefinition } from '../../../constants';
import { EditAssetDialog } from '../../EditAssetDialog';

export const CarouselAssetActions = ({
  asset,
  onDeleteAsset,
  onAddAsset,
  onEditAsset,
  canCopyLink,
  canDownload,
}) => {
  const { formatMessage } = useIntl();
  const [isEditDialogOpened, setEditDialogOpened] = useState(false);

  return (
    <>
      <CarouselActions>
        {onAddAsset && (
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.add'),
              defaultMessage: 'Add',
            })}
            icon={<AddIcon />}
            onClick={() => onAddAsset(asset)}
          />
        )}

        {canCopyLink && <CopyLinkButton url={prefixFileUrlWithBackendUrl(asset.url)} />}

        {onDeleteAsset && (
          <IconButton
            label={formatMessage({
              id: getTrad('app.utils.delete'),
              defaultMessage: 'Delete',
            })}
            icon={<DeleteIcon />}
            onClick={() => onDeleteAsset(asset)}
          />
        )}

        {onEditAsset && (
          <IconButton
            label={formatMessage({
              id: getTrad('app.utils.edit'),
              defaultMessage: 'edit',
            })}
            icon={<EditIcon />}
            onClick={() => setEditDialogOpened(true)}
          />
        )}
      </CarouselActions>

      {isEditDialogOpened && (
        <EditAssetDialog
          onClose={editedAsset => {
            setEditDialogOpened(false);

            if (editedAsset) {
              onEditAsset(editedAsset);
            }
          }}
          asset={asset}
          canUpdate
          canCopyLink={canCopyLink}
          canDownload={canDownload}
        />
      )}
    </>
  );
};

CarouselAssetActions.defaultProps = {
  canCopyLink: false,
  canDownload: false,
  onAddAsset: undefined,
  onDeleteAsset: undefined,
  onEditAsset: undefined,
};

CarouselAssetActions.propTypes = {
  asset: AssetDefinition.isRequired,
  canCopyLink: PropTypes.bool,
  canDownload: PropTypes.bool,
  onAddAsset: PropTypes.func,
  onEditAsset: PropTypes.func,
  onDeleteAsset: PropTypes.func,
};
