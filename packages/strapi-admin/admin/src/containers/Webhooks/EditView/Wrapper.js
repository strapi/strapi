/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  .header-title + div {
    button: first-of-type {
      margin-right: 30px;
      position: relative;
      overflow: initial;
      &::after {
        content: '-';
        width: 1px;
        height: 20px;
        background-color: #e9eaeb;
        position: absolute;
        top: 5px;
        right: -20px;
      }
      span svg {
        margin-top: -2px;
      }
    }
  }
  .form-wrapper {
    padding-top: 4px;
  }
  .form-card {
    padding: 21px 25px 0px 25px;
    background-color: #ffffff;
    border-radius: 2px;
    box-shadow: 0 2px 4px 0 #e3e9f3;
    margin-bottom: 30px;
  }
  .row > div:not(:last-of-type) {
    margin-bottom: 4px;
  }
`;

export default Wrapper;
