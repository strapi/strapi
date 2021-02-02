import React from 'react';
import { Modal, ModalHeader, ModalSection, ModalFooter } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button, Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import { Row } from 'reactstrap';

import { getTrad } from '../../utils';

const ModalEdit = ({ isLoading, isOpen, onCancel, onClosed, onClick, onOpened, onToggle }) => {
  const { formatMessage } = useIntl();

  return (
    <Modal isOpen={isOpen} onOpened={onOpened} onToggle={onToggle} onClosed={onClosed}>
      <ModalHeader headerBreadcrumbs={['Edit locale']} />
      <ModalSection>
        <div>
          <Padded top size="md">
            <Row>Put the form here</Row>
          </Padded>
        </div>
      </ModalSection>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onCancel}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          <Button color="success" type="button" onClick={onClick} isLoading={isLoading}>
            {formatMessage({ id: getTrad('Settings.locales.modal.edit.confirmation') })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ModalEdit.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onClosed: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onOpened: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ModalEdit;
