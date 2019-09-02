/**
*
* FooterModal
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { ModalFooter } from 'reactstrap';
import styles from './styles.scss';

function FooterModal({ children }) {
  return (
    <ModalFooter className={styles.footerModal}>
      {children}
    </ModalFooter>
  );
}

FooterModal.defaultProps = {
  children: null,
};

FooterModal.propTypes = {
  children: PropTypes.node,
};

export default FooterModal;
