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
    font-size: 13px;
    font-weight: 500;
    i {
      margin-right: 5px;
    }
  }
  button {
    cursor: pointer;
    padding: 0;
    line-height: 16px;
  }
`;

export default StyledCustomLink;
