/**
 *
 * Flex
 */

import styled from 'styled-components';

const Flex = styled.div`
  ${'' /* display: flex; */}
  height: 30px;
  display: inline-block;
  ${'' /* max-width: 250px; */}
  ${'' /* min-width: 200px; */}
  padding: 0 10px;
  background: rgba(0,126,255,0.08);
  border: 1px solid rgba(0,126,255,0.24);
  border-radius: 2px;
  line-height: 30px;
  color: #007EFF;
  font-size: 13px;
  > div:first-child {
    flex: 2;
  }
  -webkit-font-smoothing-antialiased;
`;

export default Flex;
