/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  > div:first-of-type {
    margin-bottom: 33px;
  }
  .list-wrapper {
    border-radius: 3px;
    box-shadow: 0 2px 4px #e3e9f3;
    background: white;
    > div,
    > div > div:last-of-type {
      box-shadow: none;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
  p {
    margin-bottom: 0;
  }
`;

export default Wrapper;
