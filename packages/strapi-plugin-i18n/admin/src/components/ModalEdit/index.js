import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalSection, ModalFooter } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button, Padded } from '@buffetjs/core';
import { Row } from 'reactstrap';
import useEditLocale from '../../hooks/useEditLocale';
import { getTrad } from '../../utils';

const ModalEdit = ({ localeToEdit, onClose }) => {
  const { isEditing, editLocale } = useEditLocale();
  const { formatMessage } = useIntl();
  const isOpened = Boolean(localeToEdit);

  const handleEdit = () => editLocale(localeToEdit).then(onClose);

  return (
    <Modal isOpen={isOpened} onToggle={onClose} onClosed={onClose}>
      <ModalHeader
        headerBreadcrumbs={[formatMessage({ id: getTrad('Settings.list.actions.edit') })]}
      />
      <ModalSection>
        <div>
          <Padded top size="md">
            <Row>Put the form here</Row>
          </Padded>
        </div>
      </ModalSection>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onClose}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          <Button color="success" type="button" onClick={handleEdit} isLoading={isEditing}>
            {formatMessage({ id: getTrad('Settings.locales.modal.edit.confirmation') })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ModalEdit.defaultProps = {
  localeToEdit: undefined,
};

ModalEdit.propTypes = {
  localeToEdit: PropTypes.shape({}),
  onClose: PropTypes.func.isRequired,
};

export default ModalEdit;
