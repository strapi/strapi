/**
 *
 * TrashButton
 *
 */

import styled from 'styled-components';

const TrashButton = styled.div`
  cursor: pointer;
  color: #4b515a;
  height: 24px;
  line-height: 24px;
  div,
  div + span {
    display: inline-block;
    float: right;
  }
  div {
    height: 100%;
    background-color: #f3f4f4;
    border-radius: 2px;
    padding: 0 10px;
    font-size: 13px;
    &:before {
      content: '\f1f8';
      font-size: 14px;
      font-family: FontAwesome;
      margin-right: 10px;
    }
  }
  div + span {
    margin-right: 10px;
    display: none;
  }
  :hover {
    color: #f64d0a;
    > span {
      display: inline-block;
    }
    div {
      background-color: #faa684;
    }
  }
`;
export default TrashButton;
