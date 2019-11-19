/**
 *
 * StyledCustomCheckbox
 *
 */

import styled from 'styled-components';

const StyledCustomCheckbox = styled.div`
  width: 100%;
  // padding: 0 15px;
  padding: 0;
  // margin-top: -6px;
  // margin-bottom: 16px;
  > label {
    font-weight: 500 !important;
    font-size: 12px;
    line-height: 10px;
    cursor: pointer;
    input[type='checkbox'] {
      margin-left: 0;
      margin-right: 13px;
    }
    input[type='checkbox'],
    span {
      display: inline-block;
      vertical-align: bottom;
    }
    span {
      font-weight: 500;
      font-size: 12px;
      line-height: 10px;
    }
  }
  // input[type='number'] {
  //   margin-top: -10px;
  //   margin-bottom: -4px;
  // }
`;

export default StyledCustomCheckbox;
