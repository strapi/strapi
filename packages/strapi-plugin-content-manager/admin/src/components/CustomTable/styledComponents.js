import styled, { css } from 'styled-components';

const Table = styled.table`
  border-radius: 3px;
  border-collapse: initial;
  overflow: hidden;
  box-shadow: 0 2px 4px #e3e9f3;
  table-layout: fixed;

  tr,
  th,
  td {
    border: none;
    padding: 0;
  }

  th {
    padding: 0 25px;
  }

  td {
    padding: 0 25px;
  }
`;

const Thead = styled.thead`
  background: #f3f3f3;
  height: 41px;
  overflow: hidden;

  th {
    height: 41px;
    border: none !important;
    font-size: 1.3rem;
    vertical-align: middle !important;
    > span {
      position: relative;
      cursor: pointer;
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

const TableEmpty = styled.tr`
  width: 100%;
  height: 108px;
  background: #ffffff;

  td {
    height: 106px;
    line-height: 102px;
    font-size: 1.3rem;
    font-weight: 400;
    color: #333740;
    text-align: center;
    border-collapse: collapse;
    border-top: 1px solid #f1f1f2 !important;
  }
`;

const TableRow = styled.tr`
  height: 54px;
  background: #ffffff;

  &:hover {
    cursor: pointer;
    background: #f7f8f8;
  }

  td {
    height: 53px;
    line-height: 53px;
    font-size: 1.3rem;
    font-weight: 400;
    color: #333740;
    border-collapse: collapse;
    border-top: 1px solid #f1f1f2 !important;
  }
`;

const Icon = styled.i`
  position: absolute;
  top: 3px;
  right: -12px;

  ${({ isAsc }) => {
    if (isAsc) {
      return css`
        &:before {
          vertical-align: sub;
        }
      `;
    }
    return css`
      transform: translateY(-3px) rotateZ(180deg);
    `;
  }}
`;

const Truncate = styled.div`
  display: table;
  table-layout: fixed;
  width: 100%;
`;

const Truncated = styled.div`
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionContainer = styled.td`
  text-align: right;

  i {
    margin-left: 15px;
    font-size: 1.1rem;
    color: #0e1622;

    &:first-of-type {
      margin-left: 0px;
    }
  }
`;

export {
  ActionContainer,
  Icon,
  Table,
  TableEmpty,
  TableRow,
  Thead,
  Truncate,
  Truncated,
};
