/**
 *
 * StyedListRow
 *
 */

import styled from 'styled-components';

const StyedListRow = styled.tr`
  background-color: transparent;
  cursor: pointer;
  p {
    margin-bottom: 0;
  }
  img {
    width: 35px;
  }
  &:hover {
    background-color: #f7f8f8;
  }
  td:first-of-type {
    padding-left: 3rem;
  }
  td:nth-child(2) {
    width: 25rem;
    p {
      font-weight: 500;
      text-transform: capitalize;
    }
  }
  td:last-child {
    text-align: right;
  }
  button {
    cursor: pointer;
  }
`;

export default StyedListRow;
