/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  > div:first-of-type {
    margin-bottom: 31px;
  }
  > div:last-of-type {
    > div:first-of-type {
      padding-bottom: 1.3rem;
    }
  }
`;

export default Wrapper;
