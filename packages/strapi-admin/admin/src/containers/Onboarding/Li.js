import styled from 'styled-components';

const Li = styled.li`
  display: block;
  padding: 8px 15px;
  cursor: pointer;
  margin-top: 0;

  &:hover {
    background-color: #f7f8f8;
    .title {
      color: #0e7de7;
    }
  }
  .txtWrapper,
  .thumbWrapper {
    display: inline-block;
    vertical-align: middle;
  }
  .thumbWrapper {
    position: relative;
    width: 55px;
    height: 38px;
    background-color: #d8d8d8;
    border-radius: 2px;
    overflow: hidden;
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      background-color: rgba(#0e7de7, 0.8);
    }
    img {
      position: relative;
      z-index: 0;
      width: 100%;
      height: 100%;
    }
    .play {
      position: absolute;
      top: calc(50% - 10px);
      left: calc(50% - 10px);
      width: 20px;
      height: 20px;
      background-color: #0e7de7;
      border: 1px solid white;
      text-align: center;
      line-height: 20px;
      border-radius: 50%;
      z-index: 2;
      &::before {
        content: '\f04b';
        display: inline-block;
        vertical-align: top;
        height: 100%;
        font-family: 'FontAwesome';
        color: white;
        font-size: 10px;
        margin-left: 3px;
        line-height: 18px;
      }
    }
  }
  &.finished {
    .title {
      color: #919bae;
    }
    .thumbWrapper {
      .overlay {
        background-color: transparent;
      }
      img {
        opacity: 0.6;
      }
      .play {
        background-color: #5a9e06;
        border-color: #5a9e06;
        &::before {
          content: '\f00c';
          margin-left: 0;
          font-size: 11px;
          line-height: 20px;
        }
      }
    }
  }

  .txtWrapper {
    padding: 0 15px;
    p {
      font-size: 14px;
      line-height: 24px;
      font-family: Lato;
      font-weight: 600;
    }
    .time {
      color: #919bae;
      font-family: Lato;
      font-weight: bold;
      font-size: 11px;
      line-height: 11px;
    }
  }

  .hiddenPlayerWrapper {
    display: none;
  }

  .videoModal {
    margin-right: auto !important;
    margin-left: auto !important;
    .videoModalHeader {
      padding-bottom: 0;
      border-bottom: 0;
      > h5 {
        font-family: Lato;
        font-weight: bold !important;
        font-size: 1.8rem !important;
        line-height: 3.1rem;
        color: #333740;
      }
      > button {
        display: flex;
        position: absolute;
        right: 0;
        top: 0;
        margin-top: 0;
        margin-right: 0;
        padding: 10px;
        cursor: pointer;
        span {
          line-height: 0.6em;
        }
      }
    }
    .videoPlayer {
      > button {
        top: 50%;
        margin-top: -0.75em;
        left: 50%;
        margin-left: -1.5em;
      }
    }
  }
`;

export default Li;
