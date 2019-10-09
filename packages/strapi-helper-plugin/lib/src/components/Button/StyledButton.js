import styled, { css, keyframes } from 'styled-components';
import Trash from '../../assets/icons/icon_trash.svg';

const back = css`
  background: #f3f3f3;
  color: #323740;
  font-weight: 500;
  padding: 0 15px;
  transition: all 0.2s ease;

  &:before {
    content: '\f053';
    font-family: 'FontAwesome';
    font-size: 1.2rem;
    color: #323740;
    margin-right: 10px;
  }

  &:hover {
    background: darken(#f6f6f6, 5%);
  }

  &:active {
    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.1);
  }
`;

const primary = css`
  font-weight: 500;
  min-width: 14rem;
  border: 1px solid;
  background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
  -webkit-font-smoothing: antialiased;
  color: white;
  &:active {
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
  }
`;

const primaryAddShape = css`
  font-weight: 500;
  min-width: 14rem;
  background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
  -webkit-font-smoothing: antialiased;
  color: white;
  &:active {
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
  }
  padding-left: 1.6rem;
  padding-right: 1.6rem;
  &:before {
    content: '\f067';
    font-family: 'FontAwesome';
    font-weight: 600;
    font-size: 1.3rem;
    margin-right: 13px;
  }
`;

const secondary = css`
  min-width: 10rem;
  color: #919bae;
  border: 0.1rem solid #e3e9f3;
  position: relative;
  border-radius: 3px;
  overflow: hidden;
  &:active {
    border: 0.1rem solid #b6bdca;
  }
`;

const deleteStyle = css`
  position: relative;
  padding: 0 15px;
  background: rgba(255, 0, 0, 0.15);
  color: #f23508;
  border: 0.1rem solid rgba(255, 0, 0, 0.2);
  border-radius: 3px;
  overflow: hidden;
  &:active {
    border: 0.1rem solid rgba(255, 0, 0, 0.3);
  }
  &:before {
    content: '';
    display: inline-block;
    width: 11px;
    height: 12px;
    margin-right: 8px;
    margin-top: -3px;
    background-image: url(${Trash});
    vertical-align: middle;
  }
`;

const secondaryHotline = css`
  height: 2.6rem;
  min-width: 15rem;
  color: #1c5de7;
  line-height: 1.6rem;
  border: 0.1rem solid #1c5de7;
  font-weight: 500;
  font-size: 1.3rem;
  padding-left: 1.6rem;
  padding-right: 1.6rem;
`;

const secondaryHotlineAdd = css`
  height: 2.6rem;
  min-width: auto;
  padding: 0 15px 0px;
  color: #1c5de7;
  line-height: 1.6rem;
  border: 0.1rem solid #1c5de7;
  font-weight: 500;
  font-size: 1.3rem;
  &:before {
    content: '\f067';
    font-family: 'FontAwesome';
    font-weight: 600;
    font-size: 1.3rem;
    margin-right: 13px;
  }
`;

const blink = keyframes`
  0% {
    opacity: .2;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: .2;
  }
`;

const StyledButton = styled.button`
  ${({ loader }) => {
    if (loader) {
      return css`
        height: 3rem;
        padding: 0;
        border-radius: 0.3rem;
        letter-spacing: 0.5rem;
        font-family: Lato;
        cursor: not-allowed;
        opacity: 0.65;
        &:focus {
          outline: 0;
        }
      `;
    }

    return css`
      height: 3rem;
      position: relative;
      border-radius: 0.3rem;
      white-space: nowrap;
      margin-right: 1.8rem;
      line-height: 26px;
      font-size: 13px;
      cursor: pointer;
      font-family: Lato;
      -webkit-font-smoothing: antialiased;
      &:focus {
        outline: 0;
      }
      > i {
        margin-right: 1.3rem;
        font-weight: 600;
        padding-top: 1px;
      }
      &:hover {
        &::after {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          border-radius: 0.3rem;
          content: '';
          opacity: 0.1;
          background: #ffffff;
        }
      }
      &:disabled {
        cursor: not-allowed;
      }
    `;
  }}


  ${props => {
    if (props.primary) {
      return primary;
    }

    if (props.primaryAddShape) {
      return primaryAddShape;
    }

    if (props.secondary) {
      return secondary;
    }
    if (props.secondaryHotlineAdd) {
      return secondaryHotlineAdd;
    }

    if (props.secondaryHotline) {
      return secondaryHotline;
    }

    if (props.delete) {
      return deleteStyle;
    }

    if (props.back) {
      return back;
    }
  }}

  ${({ kind }) => {
    switch (kind) {
      case 'primary':
        return primary;
      case 'primaryAddShape':
        return primaryAddShape;
      case 'secondary':
        return secondary;
      case 'secondaryHotlineAdd':
        return secondaryHotlineAdd;
      case 'secondaryHotline':
        return secondaryHotline;
      case 'delete':
        return deleteStyle;
      case 'back':
        return back;
      default:
        return '';
    }
  }}

  .saving {
    margin-top: -2.35rem;
    padding-left: 4px;
    line-height: 3.8rem;
    font-size: 4rem;
  }

  .saving span {
    animation-name: ${blink};
    animation-duration: 1.4s;
    animation-iteration-count: infinite;
    animation-fill-mode: both;
  }

  .saving span:nth-child(2) {
    animation-delay: .2s;
  }

  .saving span:nth-child(3) {
    animation-delay: .4s;
  }

`;

export default StyledButton;
