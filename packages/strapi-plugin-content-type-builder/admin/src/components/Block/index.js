/**
*
* Block
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function Block({ children }) {
  return (
    <div className={styles.block}>
      {children}
    </div>
  );
}

Block.defaultProps = {
  children: null,
};

Block.propTypes = {
  children: PropTypes.node,
};

export default Block;
