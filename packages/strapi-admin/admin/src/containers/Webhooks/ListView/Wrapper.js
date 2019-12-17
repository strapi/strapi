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
    table tr {
      td {
        p {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        &:first-of-type {
          padding-left: 30px;
          width: 65px;
        }
        &:nth-of-type(3) {
          max-width: 158px;
        }
        &:nth-of-type(3) {
          max-width: 250px;
        }
      }
    }
  }
  p {
    margin-bottom: 0;
  }
`;

export default Wrapper;
