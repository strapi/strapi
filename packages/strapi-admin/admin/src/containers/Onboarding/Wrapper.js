import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
0% {
  width: auto;
  height: auto;
  opacity: 0;
}

5% {
  opacity: 0;
}

100% {
  opacity: 1;
}
`;
const fadeOut = keyframes`
0% {
  opacity: 1;
}

60% {
  opacity: 0;
}

100% {
  opacity: 0;
  width: 0;
  height: 0;
}
`;

const Wrapper = styled.div`
  max-width: ${({ isOpen }) => (isOpen ? 'initial' : '0px')};
  position: fixed;
  right: 15px;
  bottom: 15px;
  button,
  button:focus,
  a {
    cursor: pointer;
    outline: 0;
  }
  p {
    margin-bottom: 0;
  }
  .videosHeader {
    padding: 25px 15px 0 15px;
    p {
      display: inline-block;
      vertical-align: top;
      width: 50%;
      font-family: Lato;
      font-weight: bold;
      font-size: 11px;
      color: #5c5f66;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      &:last-of-type {
        color: #5a9e06;
        text-align: right;
      }
    }
  }
  &.visible {
    opacity: 1;
    z-index: 10;
  }
  &.hidden {
    opacity: 0;
  }
  .videosContent {
    min-width: 320px;
    margin-bottom: 10px;
    margin-right: 15px;
    background-color: white;
    box-shadow: 0 2px 4px 0 #e3e9f3;
    border-radius: 3px;
    overflow: hidden;
    &.shown {
      animation: ${fadeIn} 0.5s forwards;
    }
    &.hide {
      min-width: 0;
      animation: ${fadeOut} 0.5s forwards;
    }

    ul {
      padding: 0 0 10px 0;
      margin-bottom: 0;
      list-style: none;
    }
  }
  .openBtn {
    float: right;
    width: 38px;
    height: 38px;
    button {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      color: white;
      background: #0e7de7;
      box-shadow: 0px 2px 4px 0px rgba(227, 233, 243, 1);
      i,
      svg {
        margin: auto;
      }
      i:last-of-type,
      svg:last-of-type {
        display: none;
      }
      &.active {
        i:first-of-type,
        svg:first-of-type {
          display: none;
        }
        i:last-of-type,
        svg:last-of-type {
          display: block;
        }
      }
    }
  }
`;

export default Wrapper;
