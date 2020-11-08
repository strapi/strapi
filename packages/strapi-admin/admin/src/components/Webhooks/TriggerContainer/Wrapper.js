/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  overflow-x: auto;
  margin-bottom: 22px;
  box-shadow: 0 2px 4px 0 #e3e9f3;
  table {
    width: 100%;
    height: 68px;
    background-color: white;
    border-radius: 2px;
    td {
      padding: 0 25px;
      p {
        margin-bottom: 0;
        font-size: 13px;
        line-height: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        svg,
        span {
          display: inline-block;
          vertical-align: bottom;
        }
        svg + span {
          margin-left: 10px;
        }
        &.success-label {
          svg {
            margin-bottom: -2px;
          }
        }
      }
      &:first-of-type {
        p {
          font-weight: 500;
        }
      }
      &:last-of-type {
        max-width: 400px;
        text-align: right;
        button {
          color: #b4b6ba;
          &,
          &:focus {
            outline: 0;
          }
          svg {
            margin-left: 10px;
          }
        }
      }
    }
  }
`;

export default Wrapper;
