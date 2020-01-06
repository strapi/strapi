/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    height: 67px;
    background-color: white;
    border-radius: 2px;
    box-shadow: 0 2px 4px 0 #e3e9f3;
    margin-bottom: 23px;
    td {
      padding: 0 25px;
      p {
        margin-bottom: 0;
        line-height: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        svg,
        span {
          display: inline-block;
          vertical-align: bottom;
        }
        svg {
          & + span {
            margin-left: 10px;
          }
        }
        &.success-label {
          svg {
            margin-bottom: -2px;
          }
        }
      }
      &:last-of-type {
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
