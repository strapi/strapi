/**
 *
 * LeftMenu
 *
 */

import styled from 'styled-components';

import colors from '../../assets/styles/colors';
import sizes from '../../assets/styles/sizes';

const LeftMenu = styled.div`
  width: 100%;
  height: calc(100vh - ${sizes.header.height});
  min-height: 100%;
  background-color: ${colors.leftMenu.mediumGrey};
  padding-top: 3.4rem;
  padding-left: 2rem;
  padding-right: 2rem;
  > div {
    margin-bottom: 29px;
  }
`;

export default LeftMenu;
