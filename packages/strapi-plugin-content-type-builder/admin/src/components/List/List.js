/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import { List } from '@buffetjs/styles';

const Wrapper = styled(List)`
  table-layout: fixed;
  tbody {
    td:first-of-type:not(:last-of-type) {
      width: 73px;
      padding-left: 30px;
      > svg {
        width: auto;
        height: 16px;
        position: absolute;
        left: -4px;
        top: 16px;
        display: none;
      }
    }
    td[colspan='12'] {
      position: relative;
      padding: 0 0 0 50px;
      > div {
        box-shadow: none;
      }
      &::before {
        content: '&';
        width: 5px;
        height: 100%;
        position: absolute;
        top: -7px;
        left: 45px;
        background-color: #f3f4f4;
        color: transparent;
        border-radius: 3px;
      }
    }
    tr.component-row {
      &:not(:first-of-type) {
        &::before {
          background-color: transparent;
        }
      }
      table tr td:first-of-type:not(:last-of-type) {
        width: 79px;
        padding-left: 36px;
        svg {
          display: block;
        }
      }
    }
    table + button {
      position: relative;
      background-color: transparent;
      &::before {
        content: '&';
        width: 27px;
        height: 27px;
        border-radius: 18px;
        position: absolute;
        top: 0;
        left: 0;
        background-color: #f3f4f4;
        color: transparent;
      }
      svg {
        position: absolute;
        top: 0;
        left: 0;
      }
    }
    tr.dynamiczone-row {
      &:not(:first-of-type) {
        &::before {
          background-color: transparent;
        }
      }
      > td[colspan='12'] {
        padding-left: 0;
        padding-right: 0;
      }

      .tabs-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 90px;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        padding-left: 86px;
        padding-right: 30px;
        .nav-tabs {
          border-bottom: 0;
        }
        ul.nav {
          width: 100%;
          height: 90px;
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          li {
            margin-right: 9px;
          }
        }
        & + .tab-content {
          padding-top: 90px;
          position: relative;
          z-index: 1;
        }
      }
    }
  }
`;

export default Wrapper;
