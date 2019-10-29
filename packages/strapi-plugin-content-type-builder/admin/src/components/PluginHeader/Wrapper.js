/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  margin-bottom: 30px;
  .justify-content-end {
    display: flex;
  }
  .header-title {
    p {
      width: 100%;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 1.3rem;
      font-weight: 400;
      color: #787e8f;
    }
  }
`;

export default Wrapper;
