import React from 'react';
import PropTypes from 'prop-types';
import { ConfirmDialog } from '@strapi/helper-plugin';

export const DeleteTokenDialog = ({ onClose, onConfirm, isOpen }) => {
  return <ConfirmDialog onToggleDialog={onClose} onConfirm={onConfirm} isOpen={isOpen} />;
};

DeleteTokenDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isOpen: PropTypes.bool,
};

DeleteTokenDialog.defaultProps = {
  isOpen: false,
};

export default DeleteTokenDialog;
