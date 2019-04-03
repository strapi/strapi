/*
 *
 * LeftMenu
 *
 */

import React, { memo } from 'react';
import { withRouter } from 'react-router-dom';

import LeftMenuHeader from '../../components/LeftMenuHeader';
import LeftMenuLinkContainer from '../../components/LeftMenuLinkContainer';
import LeftMenuFooter from '../../components/LeftMenuFooter';

import styles from './styles.scss';

function LeftMenu(props) {
  return (
    <div className={styles.leftMenu}>
      <LeftMenuHeader {...props} />
      <LeftMenuLinkContainer {...props} />
      <LeftMenuFooter {...props} />
    </div>
  );
}

export default withRouter(memo(LeftMenu));
