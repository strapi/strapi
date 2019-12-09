/**
 *
 * ComponentButton
 *
 */

import styled from 'styled-components';

const ComponentButton = styled.button`
  width: 139px;
  height: 90px;
  padding-top: 7px;
  &:focus {
    outline: 0;
  }

  div {
    width: 35px;
    height: 35px;
    border-radius: 18px;
    background-color: #2c3138;
    display: flex;
    margin: auto;
    svg {
      margin auto;
      width: 11px;
      height: 11px;
    }
  }
  p {
    font-size: 13px;
    font-weight: bold;
    color: #2c3138;
    line-height: normal;
    // margin-top: 7px;
    margin-top: 5px;
  }
`;

export default ComponentButton;
