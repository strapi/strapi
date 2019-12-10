/**
 *
 * StyledCustomLink
 *
 */

import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const StyledCustomLink = styled.div`
  padding-left: 15px;
  padding-top: 9px;
  line-height: 0;
  p {
    color: ${colors.blue};
    font-size: 13px;
    font-weight: 500;
    line-height: 18px;
    text-align: left;
    svg {
      margin-left: -3px;
      margin-right: 7px;
      vertical-align: initial;
      -webkit-font-smoothing: subpixel-antialiased;
    }
  }
  button {
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    padding: 0;
    line-height: 16px;
  }
`;

export default StyledCustomLink;
