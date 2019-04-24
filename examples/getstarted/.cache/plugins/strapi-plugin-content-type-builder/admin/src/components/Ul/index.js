/**
*
* Ul
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function Ul({ children, id }) {
  return (
    <div className={styles.ul} id={id}>
      {children}
    </div>
  );
}

Ul.defaultProps = {
  children: null,
  id: null,
};

Ul.propTypes = {
  children: PropTypes.node,
  id: PropTypes.string,
};

export default Ul;
