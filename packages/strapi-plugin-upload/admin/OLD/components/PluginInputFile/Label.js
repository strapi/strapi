import styled, { css, keyframes } from 'styled-components';

const Label = styled.label`
  position: relative;
  height: 146px;
  width: 100%;
  padding-top: 28px;
  border: 2px dashed #e3e9f3;
  border-radius: 2px;
  text-align: center;

  > input {
    display: none;
  }

  .icon {
    width: 82px;
    path {
      fill: ${({ showLoader }) => (showLoader ? '#729BEF' : '#ccd0da')};
      transition: fill 0.3s ease;
    }
  }

  .isDraging {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  .underline {
    color: #1c5de7;
    text-decoration: underline;
    cursor: pointer;
  }

  &:hover {
    cursor: pointer;
  }

  ${({ isDraging }) => {
    if (isDraging) {
      return css`
        background-color: rgba(28, 93, 231, 0.01) !important;
        border: 2px dashed rgba(28, 93, 231, 0.1) !important;
      `;
    }

    return '';
  }}

  ${({ showLoader }) => {
    if (showLoader) {
      return css`
        animation: ${smoothBlink('transparent', 'rgba(28,93,231,0.05)')} 2s
          linear infinite;
      `;
    }

    return '';
  }}
`;

const smoothBlink = (firstColor, secondColor) => keyframes`
  0% {
    fill: ${firstColor};
    background-color: ${firstColor};
  }
  26% {
    fill: ${secondColor};
    background-color: ${secondColor};
  }
  76% {
    fill: ${firstColor};
    background-color: ${firstColor};
  }
`;

export default Label;
