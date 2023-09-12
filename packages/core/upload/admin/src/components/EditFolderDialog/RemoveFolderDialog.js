import React from 'react';

import { ConfirmDialog } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

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
