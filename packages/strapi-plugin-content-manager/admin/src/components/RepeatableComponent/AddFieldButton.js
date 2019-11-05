import styled, { css } from 'styled-components';

const Button = styled.button`
  width: 100%;
  height: 37px;
  margin-bottom: 27px;
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
  }}

  color: #007eff;
  font-size: 12px;
  font-weight: 700;
  -webkit-font-smoothing: antialiased;
  line-height: 37px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #fff;
  > i {
    margin-right: 10px;
  }
`;

export default Button;
