import React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import PropTypes from 'prop-types';

import { useRemoveAsset } from '../../hooks/useRemoveAsset';

export const RemoveAssetDialog = ({ onClose, asset }) => {
  // `null` means asset is deleted
  const { removeAsset } = useRemoveAsset(() => onClose(null));

  const handleConfirm = async () => {
    await removeAsset(asset.id);
  };

  return <ConfirmDialog isOpen onClose={onClose} onConfirm={handleConfirm} />;
};

RemoveAssetDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
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
