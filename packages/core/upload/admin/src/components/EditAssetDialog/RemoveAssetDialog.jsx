import React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';
import PropTypes from 'prop-types';

import { useRemoveAsset } from '../../hooks/useRemoveAsset';

export const RemoveAssetDialog = ({ open, onClose, asset }) => {
  // `null` means asset is deleted
  const { removeAsset } = useRemoveAsset(() => {
    onClose(null);
  });

  const handleConfirm = async (event) => {
    event.preventDefault();
    await removeAsset(asset.id);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <ConfirmDialog onConfirm={handleConfirm} />
    </Dialog.Root>
  );
};

RemoveAssetDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  asset: PropTypes.shape({
    id: PropTypes.number,
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
};
