/**
 *
 * HomePageBlock
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function HomePageBlock({ children, className }) {
  return (
    <div
      className={cn(
        className,
        styles.homePageBlock,
      )}
    >
      {children}
    </div>
  );
}

HomePageBlock.defaultProps = {
  children: '',
  className: '',
};

HomePageBlock.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export default HomePageBlock;
