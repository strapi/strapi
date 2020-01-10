/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  padding-top: 3px;
  padding-bottom: 8px;
  table {
    width: 100%;
    border-radius: 3px;
    overflow: hidden;
  }
  tr {
    &:before {
      content: '-';
      position: absolute;
      left: 20px;
      display: inline-block;
      width: calc(100% - 40px);
      height: 1px;
      margin-top: -1px;
      line-height: 1.1em;
      color: transparent;
      background-color: #f6f6f6;
    }
    &:first-of-type:before {
      left: 0;
      height: 2px;
      width: 100%;
      background-color: #fafafb;
      z-index: 1;
    }
  }
  thead {
    background-color: #fafafb;
    td {
      height: 41px;
      text-align: center;
      font-size: 13px;
      font-weight: 500;
    }
  }
  tbody {
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
    box-shadow: inset 0px 0px 0px 1px #f6f6f6;
    td {
      height: 54px;
      padding-bottom: 3px;
      &:first-of-type {
        width: 200px;
        padding-left: 30px;
        text-transform: capitalize;
        label {
          width: fit-content;
          margin-top: -1px;
          font-weight: 500;
          cursor: pointer;
        }
      }
      &:not(:first-of-type) > div {
        display: block;
        width: fit-content;
        margin: 0 auto;
      }
    }
  }
`;

export default Wrapper;
