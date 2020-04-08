import styled, { css } from 'styled-components';

const Button = styled.button`
  width: 100%;
  height: 37px;
  margin-bottom: 21px;
  padding: 0 0 3px 0;
  text-align: center;
  border: 1px solid rgba(227, 233, 243, 0.75);
  border-top: 1px solid
    ${({ doesPreviousFieldContainErrorsAndIsClosed }) =>
      doesPreviousFieldContainErrorsAndIsClosed
        ? '#FFA784'
        : 'rgba(227, 233, 243, 0.75)'};

  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
  ${({ withBorderRadius }) => {
    if (withBorderRadius) {
      return css`
        border-radius: 2px;
      `;
    }

    return '';
  }}

  ${({ hasMinError }) => {
    if (hasMinError) {
      return `
        border-color: #FAA684;
        border-top-color: rgba(227, 233, 243, 0.75);
      `;
    }

    return '';
  }}

  color: #007eff;
  font-size: 12px;
  font-weight: 700;
  -webkit-font-smoothing: antialiased;
  line-height: normal;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #fff;
  &:focus {
    outline: 0;
  }
  > i,
  svg {
    margin-right: 10px;
  }
  & + p {
    margin-bottom: 17px;
    margin-top: -18px;
  }
`;

export default Button;
