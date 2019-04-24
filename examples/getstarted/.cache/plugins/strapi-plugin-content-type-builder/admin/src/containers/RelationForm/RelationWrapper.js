import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

const RelationWrapper = ({ children }) => <div className={styles.relationWrapper}>{children}</div>;

RelationWrapper.defaultProps = {
  children: null,
};

RelationWrapper.propTypes = {
  children: PropTypes.node,
};

export default RelationWrapper;
