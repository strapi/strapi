/**
*
* HeaderModal
*
*/

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

function HeaderModal({ children }) {
  return (
    <div className={styles.headerModal}>
      {children}
    </div>
  );
}

HeaderModal.defaultProps = {
  children: null,
};

HeaderModal.propTypes = {
  children: PropTypes.node,
};

export default HeaderModal;
