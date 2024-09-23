import React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';
import PropTypes from 'prop-types';

export const RemoveFolderDialog = ({ onClose, onConfirm, open }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <ConfirmDialog onConfirm={onConfirm} />
    </Dialog.Root>
  );
};

RemoveFolderDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default RemoveFolderDialog;
