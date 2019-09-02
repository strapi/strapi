/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import { withRouter } from 'react-router-dom';

import LeftMenuHeader from '../../components/LeftMenuHeader';
import LeftMenuLinkContainer from '../../components/LeftMenuLinkContainer';
import LeftMenuFooter from '../../components/LeftMenuFooter';

import styles from './styles.scss';

function LeftMenu(props) {
  return (
    <div className={styles.leftMenu}>
      <LeftMenuHeader key="header" {...props} />
      <LeftMenuLinkContainer {...props} />
      <LeftMenuFooter key="footer" {...props} />
    </div>
  );
}

export default withRouter(LeftMenu);
