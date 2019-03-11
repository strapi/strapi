/**
*
* BodyModal
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { ModalBody } from 'reactstrap';

import styles from './styles.scss';

function BodyModal({ children }) {
  return (
    <ModalBody className={styles.bodyModal}>
      <div className="container-fluid">
        <div className="row">
          {children}
        </div>
      </div>
    </ModalBody>
  );
}

/* istanbul ignore next */
BodyModal.defaultProps = {
  children: null,
};

BodyModal.propTypes = {
  children: PropTypes.node,
};

export default BodyModal;
