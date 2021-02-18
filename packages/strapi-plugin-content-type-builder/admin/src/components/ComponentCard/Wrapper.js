/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.button`
  width: 139px;
  height: 90px;
  position: relative;
  padding: 0;
  padding-top: 5px;
  border-radius: 2px;
  text-align: center;
  border: solid 1px #fafafb;
  background-color: #fafafb;

  &:focus {
    outline: 0;
  }

  div:first-of-type {
    display: flex;
    width: 35px;
    height: 35px;
    margin: auto;
    border-radius: 18px;
    background-color: #e9eaeb;
    color: #919bae;
    font-size: 12px;

    svg {
      margin: auto;
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
    margin-top: 5px;
    padding-left: 5px;
    padding-right: 5px;
    line-height: normal;
    font-size: 13px;
    font-weight: bold;
    color: #919bae;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.active {
    cursor: initial;
  }

  &:hover,
  &.active {
    border-color: #aed4fb;
    background-color: #e6f0fb;

    div:first-of-type {
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
