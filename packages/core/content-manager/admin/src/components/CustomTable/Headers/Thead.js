import styled, { css } from 'styled-components';

/* eslint-disable consistent-return */

const Thead = styled.thead`
  background: #f3f3f3;
  height: 43px;
  overflow: hidden;

  th {
    height: 43px;
    border: none !important;
    font-size: 1.3rem;
    vertical-align: middle !important;
    > span {
      position: relative;
      &.sortable {
        cursor: pointer;
      }
    }
  }
  ${({ isBulkable }) => {
    if (isBulkable) {
      return css`
        > tr {
          th:first-child {
            width: 50px;
          }
        }
      `;
    }
  }}
`;

export default Thead;
