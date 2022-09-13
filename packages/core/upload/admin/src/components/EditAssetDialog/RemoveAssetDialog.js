import React from 'react';
import PropTypes from 'prop-types';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { useRemoveAsset } from '../../hooks/useRemoveAsset';

export const RemoveAssetDialog = ({ onClose, asset }) => {
  const { isLoading, removeAsset } = useRemoveAsset(onClose);

  const handleConfirm = () => {
    removeAsset(asset.id);
  };

  return (
    <ConfirmDialog
      isConfirmButtonLoading={isLoading}
      isOpen
      onToggleDialog={onClose}
      onConfirm={handleConfirm}
    />
  );
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
