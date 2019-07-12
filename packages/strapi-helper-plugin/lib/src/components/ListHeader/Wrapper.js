/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  padding: 1.9rem 3rem 1.8rem 3rem;
  position: relative;
  background-color: white;
  div {
    p {
      width: fit-content;
      display: inline-block;
    }
  }
  p {
    margin-bottom: 0;
  }
  button {
    position: absolute;
    top: 1.7rem;
    right: 1rem;
    outline: 0;
  }
`;

export default Wrapper;
