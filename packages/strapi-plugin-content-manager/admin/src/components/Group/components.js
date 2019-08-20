import styled, { css } from 'styled-components';

const Button = styled.div`
  width: 100%;
  height: 37px;
  margin-bottom: 27px;
  text-align: center;
  border: 1px solid #e3e9f3;
  border-top: 1px solid
    ${({ doesPreviousFieldContainErrorsAndIsClosed }) =>
      doesPreviousFieldContainErrorsAndIsClosed ? '#FFA784' : '#e3e9f3'};

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
  > i {
    margin-right: 10px;
  }
`;

const FormWrapper = styled.div`
  padding-top: 27px;
  padding-left: 20px;
  padding-right: 20px;
  border-top: 1px solid
    ${({ hasErrors, isOpen }) => {
      if (hasErrors) {
        return '#ffa784';
      } else if (isOpen) {
        return '#AED4FB';
      } else {
        return '#e3e9f3';
      }
    }};
`;

export { Button, FormWrapper };
