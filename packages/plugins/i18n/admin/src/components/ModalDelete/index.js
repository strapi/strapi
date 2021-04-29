import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import { ModalConfirm } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import useDeleteLocale from '../../hooks/useDeleteLocale';
import { getTrad } from '../../utils';

const ModalDelete = ({ localeToDelete, onClose }) => {
  const { isDeleting, deleteLocale } = useDeleteLocale();
  const { formatMessage } = useIntl();
  const isOpened = Boolean(localeToDelete);

  const handleDelete = () => deleteLocale(localeToDelete.id).then(onClose);

  return (
    <ModalConfirm
      confirmButtonLabel={{
        id: getTrad('Settings.locales.modal.delete.confirm'),
      }}
      showButtonLoader={isDeleting}
      isOpen={isOpened}
      toggle={onClose}
      onClosed={onClose}
      onConfirm={handleDelete}
      type="warning"
      content={{
        id: getTrad(`Settings.locales.modal.delete.message`),
      }}
    >
      <Text fontWeight="bold">
        {formatMessage({ id: getTrad('Settings.locales.modal.delete.secondMessage') })}
      </Text>
    </ModalConfirm>
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
