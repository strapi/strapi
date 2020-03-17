/* eslint-disable */

import styled, { css } from 'styled-components';

const Table = styled.table`
  border-radius: 3px;
  border-collapse: initial;
  box-shadow: 0 2px 4px #e3e9f3;
  table-layout: fixed;
  margin-bottom: 0;

  tr,
  th,
  td {
    border: none;
    padding: 0;
  }

  th,
  td {
    padding: 0 25px;

    label {
      display: inline;
    }
  }
`;

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

const TableEmpty = styled.tr`
  width: 100%;
  height: 108px;
  background: #ffffff;

  td {
    height: 106px;
    line-height: 90px;
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
    font-size: 1.3rem;
    line-height: 1.8rem;
    font-weight: 400;
    color: #333740;
    vertical-align: middle;
    border-collapse: collapse;
    border-top: 1px solid #f1f1f2 !important;
  }
`;

const Arrow = styled.span`
  &:after {
    content: '\f0d8';
    font-family: 'FontAwesome';
    font-size: 13px;
    font-weight: 600;
    position: absolute;
    top: 0px;
    right: -12px;
  }
  &.isAsc {
    &:after {
      transform: rotateZ(180deg);
    }
  }
`;

const Truncate = styled.div``;

const Truncated = styled.p`
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0;
`;

const TableDelete = styled.tr`
  width: 100%;
  height: 36px;
  background: #f7f8f8;

  td {
    height: 36px;
    line-height: 36px;
    font-size: 1.3rem;
    font-weight: 400;
    color: #333740;
    text-align: left;
    border-collapse: collapse;
    border-top: 1px solid #f1f1f2 !important;
  }
`;

const ActionContainer = styled.td`
  text-align: right;

  i,
  svg {
    margin-left: 15px;
    font-size: 1rem;
    height: 1rem;
    color: #333740;

    &:first-of-type {
      margin-left: 0px;
    }
  }
`;
const DeleteSpan = styled.span`
  font-weight: 600;
  -webkit-font-smoothing: antialiased;
  &:after {
    content: '—';
    margin: 0 7px;
    font-size: 13px;
    font-weight: 600;
  }
`;

const DeletAllSpan = styled.span`
  position: absolute;
  color: #f64d0a;
  font-weight: 500;
  cursor: pointer;
  &:after {
    position: relative;
    top: -1px;
    content: '\f1f8';
    margin-left: 7px;
    font-size: 13px;
    font-family: FontAwesome;
    -webkit-font-smoothing: antialiased;
  }
`;

export {
  ActionContainer,
  Arrow,
  DeletAllSpan,
  DeleteSpan,
  Table,
  TableDelete,
  TableEmpty,
  TableRow,
  Thead,
  Truncate,
  Truncated,
};
