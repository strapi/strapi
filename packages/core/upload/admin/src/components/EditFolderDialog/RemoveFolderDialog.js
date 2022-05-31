import React from 'react';
import PropTypes from 'prop-types';
import { ConfirmDialog } from '@strapi/helper-plugin';

export const RemoveFolderDialog = ({ onClose, onConfirm }) => {
  return (
    <ConfirmDialog
      isConfirmButtonLoading={false}
      isOpen
      onToggleDialog={onClose}
      onConfirm={onConfirm}
    />
  );
};

RemoveFolderDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default RemoveFolderDialog;
