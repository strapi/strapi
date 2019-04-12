import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

const InlineBlock = ({ children, ...rest }) => (
  <div className={styles.inlineBlock} {...rest}>
    {children}
  </div>
);

InlineBlock.defaultProps = {
  children: null,
};

InlineBlock.propTypes = {
  children: PropTypes.node,
};

export default InlineBlock;
