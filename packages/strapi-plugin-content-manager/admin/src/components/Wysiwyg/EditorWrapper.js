import styled, { css } from 'styled-components';
/* eslint-disable */
const EditorWrapper = styled.div`
  ${({ isFullscreen }) => {
    if (isFullscreen) {
      return css`
        position: fixed;
        z-index: 1040;
        top: calc(6rem + 90px);
        left: calc(24rem + 28px);
        right: 28px;
        bottom: 32px;
        display: flex;
        background-color: transparent;
        z-index: 99999;

        > div {
          min-width: 50%;
        }
        > div:first-child {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        > div:last-child {
          border-left: 0;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        .editorWrapper {
          border-color: #f3f4f4 !important;
        }
      `;
    }
  }}

  .controlsContainer {
    display: flex;
    box-sizing: border-box;
    background-color: #f3f4f4;

    select {
      min-height: 31px !important;
      min-width: 161px !important;
      font-weight: 600;
      outline: none;

      &:focus,
      &:active {
        border: 1px solid #e3e9f3;
      }
    }
  }

  .editorWrapper {
    min-height: 320px;
    margin-top: 0.9rem;
    border: 1px solid #f3f4f4;
    border-radius: 0.25rem;
    line-height: 18px !important;
    font-size: 13px;
    box-shadow: 0px 1px 1px rgba(104, 118, 142, 0.05);
    background-color: #fff;
    position: relative;
  }

  .editorError {
    border-color: #ff203c !important;
  }

  .editor {
    min-height: 294px;
    max-height: 555px;
    padding: 20px 20px 0 20px;
    font-size: 13px;
    background-color: #fff;
    line-height: 18px !important;
    cursor: text;
    overflow: auto;

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 0;
      line-height: 18px !important;
    }
    h1 {
      margin-top: 13px !important;
      margin-bottom: 22px;
    }
    > div {
      > div {
        > div {
          margin-bottom: 32px;
        }
      }
    }
    li {
      margin-top: 0;
    }
    ul,
    ol {
      margin-bottom: 18px;
    }
  }

  .editorFullScreen {
    max-height: calc(100% - 70px) !important;
    margin-bottom: 0;
    overflow: auto;
  }

  .editorInput {
    height: 0;
    width: 0;
  }
`;

export default EditorWrapper;
