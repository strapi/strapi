/**
 *
 * WrapperModal
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader } from 'reactstrap';
import styles from './styles.scss';

function WrapperModal({ children, isOpen, onToggle, ...rest }) {
  return (
    <div className={styles.wrapperModal}>
      <Modal isOpen={isOpen} toggle={onToggle} className={styles.modal} {...rest}>
        <ModalHeader className={styles.headerModalWrapper} toggle={onToggle} />
        {children}
      </Modal>
    </div>
  );
}

WrapperModal.defaultProps = {
  children: null,
};

WrapperModal.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default WrapperModal;
