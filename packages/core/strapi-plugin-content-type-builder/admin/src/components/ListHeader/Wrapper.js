/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  padding: 2.1rem 6rem 1.7rem 3rem;
  background-color: white;
  .list-header-actions {
    position: absolute;
    top: 1.8rem;
    right: 3rem;
    button {
      outline: 0;
      margin-left: 10px;
    }
  }
`;

export default Wrapper;
