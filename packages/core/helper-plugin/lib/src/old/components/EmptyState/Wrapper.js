/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  padding: 54px 30px 30px;
  text-align: center;
  background-color: white;
  p,
  a {
    line-height: normal;
  }
  p {
    &:first-of-type {
      font-size: 18px;
      font-weight: 600;
      color: #333740;
      margin-bottom: 18px;
    }
  }
  a {
    color: #007eff;
  }
`;

export default Wrapper;
