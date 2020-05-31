import styled, { css } from 'styled-components';

/* eslint-disable indent */
const Button = styled.button`
  display: flex;
  height: 32px;
  min-width: 32px;
  background-color: #ffffff;
  border: 1px solid rgba(16, 22, 34, 0.1);
  font-size: 13px;
  font-weight: 500;
  line-height: 32px;
  text-align: center;
  cursor: pointer;

  &:hover {
    background-color: #f3f4f4;
  }
  &:active,
  &:focus {
    outline: 0;
  }

  ${({ active, disabled }) => {
    if (active) {
      return css`
        border: 0;
        background: rgba(16, 22, 34, 0);
        box-shadow: inset 0 -1px 0 0 rgba(16, 22, 34, 0.04), inset 0 1px 0 0 rgba(16, 22, 34, 0.04);
      `;
    }

    if (disabled) {
      return css`
        opacity: 0.7;
        cursor: not-allowed;
      `;
    }

    return '';
  }}

  > svg {
    margin: auto;
    > text {
      font-family: Baskerville-SemiBoldItalic, Baskerville;
    }
  }

  background-position: center;
  background-repeat: no-repeat;
`;

export default Button;
