import React from 'react';
import PropTypes from 'prop-types';
import { ConfirmDialog } from '@strapi/helper-plugin';

export const DeleteTokenDialog = ({ onClose, onConfirm }) => {
  return <ConfirmDialog onToggleDialog={onClose} onConfirm={onConfirm} isOpen />;
};

DeleteTokenDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default DeleteTokenDialog;
