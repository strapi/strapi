/**
*
* LeftMenu
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function LeftMenu({ children }) {
  return (
    <div className={cn(styles.pluginLeftMenu, 'col-md-3')}>
      {children}
    </div>
  );
}

LeftMenu.defaultProps = {
  children: null,
};

LeftMenu.propTypes = {
  children: PropTypes.node,
};

export default LeftMenu;
