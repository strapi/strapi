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
    table + div button {
      position: relative;
      background-color: transparent;
      text-transform: initial;
      color: #9ea7b8;
      text-align: left;
      padding-left: 35px;
      border-color: transparent;
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
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        padding-top: 18px;
        padding-left: 86px;
        padding-right: 30px;
        .nav-tabs {
          border-bottom: 0;
        }
        ul.nav {
          width: 100%;
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          li {
            margin-right: 9px;
          }
        }
        & + .tab-content {
          padding-top: 126px;
          position: relative;
          z-index: 1;
        }
      }
    }
  }
  & + .plus-icon {
    width: 27px;
    height: 27px;
    border-radius: 18px;
    position: absolute;
    bottom: 14px;
    left: 34px;
    background-color: ${({ isFromDynamicZone }) => (isFromDynamicZone ? '#AED4FB' : '#f3f4f4')};

    color: transparent;
    text-align: center;
    line-height: 27px;
    display: flex;
    cursor: pointer;
    svg {
      margin: auto;
      width: 11px;
      height: 11px;
    }
  }
`;

Wrapper.defaultProps = {
  isFromDynamicZone: false,
};

export default Wrapper;
