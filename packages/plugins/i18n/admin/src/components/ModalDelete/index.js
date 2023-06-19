import React from 'react';

import { ConfirmDialog } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

import useDeleteLocale from '../../hooks/useDeleteLocale';

const ModalDelete = ({ localeToDelete, onClose }) => {
  const { isDeleting, deleteLocale } = useDeleteLocale();
  const isOpened = Boolean(localeToDelete);

  const handleDelete = () => deleteLocale(localeToDelete.id).then(onClose);

  return (
    <ConfirmDialog
      isConfirmButtonLoading={isDeleting}
      onConfirm={handleDelete}
      onToggleDialog={onClose}
      isOpen={isOpened}
    />
  );
};

ModalDelete.defaultProps = {
  localeToDelete: undefined,
};

ModalDelete.propTypes = {
  localeToDelete: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};

export default ModalDelete;
