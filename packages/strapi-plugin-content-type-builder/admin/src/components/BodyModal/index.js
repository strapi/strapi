/**
*
* BodyModal
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { ModalBody } from 'reactstrap';

import styles from './styles.scss';

function BodyModal({ children, onSubmit }) {
  return (
    <ModalBody className={styles.bodyModal}>
      <form onSubmit={onSubmit}>
        <div className="container-fluid">
          <div className="row">
            {children}
          </div>
        </div>
      </form>
    </ModalBody>
  );
}

/* istanbul ignore next */
BodyModal.defaultProps = {
  children: null,
  onSubmit: (e) => {
    e.preventDefault();
  },
};

BodyModal.propTypes = {
  children: PropTypes.node,
  onSubmit: PropTypes.func,
};

export default BodyModal;
