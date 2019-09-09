/**
 *
 * Tr
 *
 */

import styled from 'styled-components';

const Tr = styled.tr`
  background-color: transparent;
  cursor: pointer;
  &:hover {
    background-color: #f7f8f8;
  }
  td:first-child {
    p {
      font-weight: 500;
      text-transform: capitalize;
    }
  }
  td:last-child {
    text-align: right;
  }
  button {
    &:focus {
      outline: 0;
    }
    cursor: pointer;
  }
  p {
    margin-bottom: 0;
  }
`;

export default Tr;
