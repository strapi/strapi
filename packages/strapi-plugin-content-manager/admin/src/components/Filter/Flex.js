/**
 *
 * Flex
 */

import styled from 'styled-components';

const Flex = styled.div`
  height: 30px;
  display: inline-block;
  margin-bottom: 6px;
  margin-right: 10px;
  padding: 0 10px;
  background: rgba(0,126,255,0.08);
  border: 1px solid rgba(0,126,255,0.24);
  border-radius: 2px;
  line-height: 30px;
  color: #007EFF;
  font-size: 13px;
  > span:nth-child(2) {
    font-weight: 700;
  }
  > span:nth-child(3) {
    cursor: pointer;
  }
  -webkit-font-smoothing-antialiased;
`;

export default Flex;
