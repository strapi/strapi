import React from 'react';
import { Modal, ModalHeader, ModalSection, ModalFooter } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button, Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import BaselineAlignment from '../ListBaselineAlignment';
import Wrapper from './Wrapper';

const ModalForm = ({
  children,
  headerBreadcrumbs,
  isLoading,
  isOpen,
  onCancel,
  onClosed,
  onClick,
  onOpened,
  onToggle,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Modal isOpen={isOpen} onOpened={onOpened} onToggle={onToggle} onClosed={onClosed}>
      <ModalHeader headerBreadcrumbs={headerBreadcrumbs} />
      <ModalSection>
        <Wrapper>
          <BaselineAlignment />
          <Padded top size="md">
            {children}
          </Padded>
        </Wrapper>
      </ModalSection>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onCancel}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          <Button color="success" type="button" onClick={onClick} isLoading={isLoading}>
            {formatMessage({ id: 'app.components.Button.save' })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ModalForm.propTypes = {
  children: PropTypes.node.isRequired,
  headerBreadcrumbs: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onClosed: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onOpened: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ModalForm;
