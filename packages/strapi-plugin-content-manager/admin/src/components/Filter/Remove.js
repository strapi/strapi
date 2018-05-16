/**
 *
 * Remove
 */

import styled from 'styled-components';

const Remove = styled.span`
  height: 30px;
  cursor: pointer;
  &:after {
    content: '\f00d';
    font-family: FontAwesome;
    font-size: 11px;
    font-weight: 400;
  }
`;

export default Remove;
