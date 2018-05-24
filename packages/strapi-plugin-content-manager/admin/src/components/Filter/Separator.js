/**
 *
 * Separator
 *
 */

import styled from 'styled-components';

const Separator = styled.span`
  height: 30px;
  margin-left: 10px;
  margin-right: 10px;
  line-height: 30px;
  &:after {
    content: '';
    height: 15px;
    border-left: 1px solid #007EFF;
    opacity: 0.1;
  }
`;

export default Separator;
