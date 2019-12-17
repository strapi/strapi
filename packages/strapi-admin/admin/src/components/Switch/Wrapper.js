/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  .button {
    width: 30px;
    height: 18px;
    position: relative;
    z-index: 2;
    margin-right: 12px;
    .button-rect {
      width: 30px;
      height: 12px;
      background-color: #6dbb1a;
      border-radius: 6px;
      margin-top: 2px;
    }
    .button-circle {
      background-color: #f1f1f1;
      position: absolute;
      top: 0;
      right: 0;
      width: 18px;
      height: 18px;
      border-radius: 9px;
    }
  }
  input {
    z-index: 3;
    cursor: pointer;
  }
  input:checked + .button {
    .button-rect {
      background-color: #faa684;
    }
    .button-circle {
      left: 0;
    }
  }
  .button,
  p {
    display: inline-block;
    vertical-align: top;
  }
`;

export default Wrapper;
