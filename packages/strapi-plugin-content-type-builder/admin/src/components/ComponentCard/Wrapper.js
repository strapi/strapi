/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.button`
  position: relative;
  background-color: #fafafb;
  width: 139px;
  // height: 100%;
  height: 90px;
  border-radius: 2px;
  border: 0;
  padding: 0;
  padding-top: 5px;
  text-align: center;
  border: solid 1px #fafafb;

  &:focus {
    outline: 0;
  }


  div:first-of-type {
    width: 35px;
    height: 35px;
    border-radius: 18px;
    background-color: #e9eaeb;
    color: #919bae;
    font-size: 12px;
    display: flex;
    margin: auto;
    svg {
      margin auto;
    }
  }

  div:last-of-type {
    position: absolute;
    padding: 0 7px;
    top: 0;
    right: 0;
    display: none;
  }

  p {
    font-size: 13px;
    font-weight: bold;
    color: #919bae;
    line-height: normal;
    // margin-top: 7px;
    margin-top: 5px;
    // margin: 0;
    padding-left: 5px;
    padding-right: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &.active {
    cursor: initial;
  }
  &:hover, &.active {
    border-color: #aed4fb;
    background-color: #e6f0fb;
    div:first-of-type  {
      background-color: #aed4fb;
      color: #007eff;
    }
    div:last-of-type {
      display: block;
    }
    p {
      color: #007eff;
    }
  }
`;

export default Wrapper;
