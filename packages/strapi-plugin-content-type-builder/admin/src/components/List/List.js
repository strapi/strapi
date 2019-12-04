/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import { List } from '@buffetjs/styles';

const Wrapper = styled(List)`
  tbody {
    td:first-of-type:not(:last-of-type) {
      width: 73px;
      padding-left: 30px;
      > svg {
        width: 20px;
        position: absolute;
        left: 0;
        bottom: 0;
        display: none;
      }
    }
    td[colspan='12'] {
      position: relative;
      padding: 0 0 0 56px;
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
      table tr td:first-of-type:not(:last-of-type) svg {
        display: block;
      }
    }
    tr.dynamiczone-row {
      > td[colspan='12'] {
        padding-left: 0;
        padding-right: 0;
        &::before {
          background-color: transparent;
        }
      }
    }
  }
`;

export default Wrapper;
