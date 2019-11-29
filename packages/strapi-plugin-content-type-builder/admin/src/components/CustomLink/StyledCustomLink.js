/**
 *
 * StyledCustomLink
 *
 */

import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const StyledCustomLink = styled.div`
  padding-left: 15px;
  padding-top: 10px;
  line-height: 0;
  p {
    color: ${colors.blue};
    i,
    svg {
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
