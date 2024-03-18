import React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import PropTypes from 'prop-types';

export const RemoveFolderDialog = ({ onClose, onConfirm }) => {
  return <ConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} />;
};

RemoveFolderDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default RemoveFolderDialog;
