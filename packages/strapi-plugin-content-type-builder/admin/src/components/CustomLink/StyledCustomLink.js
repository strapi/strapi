/**
 *
 * StyledCustomLink
 *
 */

import styled from 'styled-components';

const StyledCustomLink = styled.div`
  padding-left: 15px;
  padding-top: 9px;
  line-height: 0;
  margin-left: -3px;

  button {
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    padding: 0;
    line-height: 16px;
  }
`;

export default StyledCustomLink;
