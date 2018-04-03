/**
 *
 * HomePageBlock
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

function HomePageBlock({ children }) {
  return (
    <div className={styles.homePageBlock}>
      {children}
    </div>
  );
}

HomePageBlock.defaultProps = {
  children: '',
};

HomePageBlock.propTypes = {
  children: PropTypes.node,
};

export default HomePageBlock;
