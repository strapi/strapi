import styled, { css } from 'styled-components';
/* eslint-disable */

const Wrapper = styled.div`
  margin-left: 29px;
  > div {
    height: 30px;
    width: 100%;
    justify-content: space-between;
    background: #ffffff;
    color: #333740;
    border-radius: 2px;
    border: solid 1px #007eff;

    > button {
      cursor: pointer;
      padding-left: 10px !important;
      line-height: 30px;
      width: 100%;
      color: #333740;
      text-align: left;
      background-color: #ffffff;
      border: none;
      font-size: 13px;
      font-weight: 500;
      &:focus,
      &:active,
      &:hover,
      &:visited {
        background-color: transparent !important;
        box-shadow: none;
        color: #333740;
      }
      > p {
        position: relative;
        height: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
        margin-bottom: 0;
        margin-top: -1px;
        color: #007eff !important;
        font-size: 13px !important;
        svg {
          fill: #007eff;
          margin-right: 7px;
          vertical-align: initial;
        }
      }
    }
    > div {
      max-height: 180px;
      min-width: calc(100% + 2px);
      margin-left: -1px;
      margin-top: -1px;
      padding: 0;
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0;
      border-color: #e3e9f3 !important;
      border-top-color: #aed4fb !important;
      box-shadow: 0 2px 3px rgba(227, 233, 245, 0.5);

      overflow: scroll;

      button {
        height: 30px;
        padding-left: 10px !important;
        line-height: 26px;
        cursor: pointer;
        font-size: 13px !important;
        &:focus,
        &:active,
        &:hover {
          background-color: #fafafb !important;
          color: #333740;
          outline: 0;
        }
        div {
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

  ${({ isOpen }) => {
    if (isOpen) {
      return css`
        > div {
          background-color: #e6f0fb !important;
          border-color: #aed4fb !important;
        }
      `;
    }
  }}

  ${({ notAllowed }) => {
    if (notAllowed) {
      return css`
        > div {
          > button {
            cursor: not-allowed !important;
          }
        }
      `;
    }
  }}
`;

export { Wrapper };
