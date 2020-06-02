/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { LeftMenuFooter, LeftMenuHeader, LeftMenuLinkContainer } from '../../components/LeftMenu';

import Wrapper from './Wrapper';

const LeftMenu = ({ version, plugins }) => (
  <Wrapper>
    <LeftMenuHeader />
    <LeftMenuLinkContainer plugins={plugins} />
    <LeftMenuFooter key="footer" version={version} />
  </Wrapper>
);

LeftMenu.propTypes = {
  version: PropTypes.string.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default LeftMenu;
