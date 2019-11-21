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
import Wrapper from './Wrapper';

function LeftMenu(props) {
  return (
    <Wrapper>
      <LeftMenuHeader key="header" {...props} />
      <LeftMenuLinkContainer {...props} />
      <LeftMenuFooter key="footer" {...props} />
    </Wrapper>
  );
}

export default withRouter(LeftMenu);
