/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import { sizes } from '@buffetjs/styles';

const Wrapper = styled.div`
  margin-top: 12px;
  padding: 23px 24px 26px 24px;
  background-color: #fafafb;
  border-radius: ${sizes.borderRadius};
  > ul {
    margin-bottom: 0;
    padding: 0;
    list-style-type: none;
    & + button {
      padding: 0;
      color: #007eff;
      font-size: 13px;
      font-weight: 500;
      outline: 0;
      svg,
      span {
        vertical-align: middle;
      }
      svg {
        margin-right: 10px;
      }
    }
    li {
      position: relative;
      padding-right: 30px;
      &:not(:first-of-type) {
        margin-bottom: 20px;
      }
      &:last-of-type {
        margin-bottom: 6px;
      }
      > section {
        display: inline-block;
        width: 50%;
        vertical-align: top;
        &:nth-child(odd) {
          padding-right: 15px;
        }
        &:nth-child(even) {
          padding-left: 15px;
        }
        > p {
          font-size: 13px;
          color: #333740;
          font-weight: 500;
        }
        > div:first-of-type {
          height: 34px;
          > div:first-of-type {
            height: 34px;
            min-height: 34px;
            border: 1px solid #e3e9f3;
            border-radius: 2px;
            font-size: 13px;
            color: #333740;
            align-items: normal;
            > div:first-of-type {
              height: 32px;
              padding: 0 1rem;
            }
            > div:last-of-type {
              display: none;
            }
            &:hover {
              cursor: text;
            }
          }
          > span + div:first-of-type {
            border-color: #78caff;
            box-shadow: none;
          }
        }
        & + div {
          position: absolute;
          top: 7px;
          right: 0;
          button {
            margin: 0;
          }
        }
      }
    }
  }

  .bordered {
    input {
      border: 1px solid #f64d0a;
    }
  }
`;

export default Wrapper;
