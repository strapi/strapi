import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader } from 'strapi-helper-plugin';
import ModalBody from '../../../components/Users/ModalCreateBody';

const ModalForm = ({ isOpen, onClosed, onToggle }) => {
  return (
    <Modal isOpen={isOpen} onToggle={onToggle} onClosed={onClosed}>
      <ModalHeader headerBreadcrumbs={['Settings.permissions.users.add-new']} />
      <ModalBody />
    </Modal>
  );
};

ModalForm.defaultProps = {
  onClosed: () => {},
};

ModalForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClosed: PropTypes.func,
  onToggle: PropTypes.func.isRequired,
};

export default ModalForm;
