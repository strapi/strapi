/**
 *
 * TrashButton
 *
 */

import styled from 'styled-components';

const TrashButton = styled.div`
  height: 24px;
  line-height: 24px;
  color: #4b515a;
  cursor: pointer;
  div,
  div + span {
    display: inline-block;
    float: right;
  }
  div {
    height: 100%;
    background-color: #f3f4fb;
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
    display: none;
    margin-right: 10px;
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
