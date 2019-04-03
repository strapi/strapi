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

import ErrorBoundary from '../ErrorBoundary';

import styles from './styles.scss';

function LeftMenu(props) {
  return (
    <div className={styles.leftMenu}>
      <LeftMenuHeader key="header" {...props} />
      <ErrorBoundary key="plugins">
        <LeftMenuLinkContainer {...props} />
      </ErrorBoundary>
      <LeftMenuFooter key="footer" {...props} />
    </div>
  );
}

export default withRouter(memo(LeftMenu));
