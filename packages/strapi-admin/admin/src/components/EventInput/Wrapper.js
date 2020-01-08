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
      display: inline-block;
      line-height: 1.1em;
      color: transparent;
      background-color: #f6f6f6;
      position: absolute;
      left: 20px;
      width: calc(100% - 40px);
      height: 1px;
      margin-top: -1px;
    }
    &:first-of-type:before {
      background-color: #fafafb;
      z-index: 1;
      height: 2px;
      width: 100%;
      left: 0;
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
        padding-left: 30px;
        text-transform: capitalize;
        width: 200px;
        label {
          width: fit-content;
          margin-top: -1px;
          font-weight: 500;
          cursor: pointer;
        }
      }
      &:not(:first-of-type) > div {
        margin: 0 auto;
        display: block;
        width: fit-content;
      }
    }
  }
`;

export default Wrapper;
