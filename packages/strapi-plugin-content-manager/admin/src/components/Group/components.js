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

const Flex = styled.div`
  display: flex;
  > button {
    cursor: pointer;
    padding-top: 0;
  }
`;

const GroupCollapseWrapper = styled(Flex)`
  height: 36px;
  padding: 0 15px;
  justify-content: space-between;
  border: 1px solid ${({ hasErrors, isOpen }) => {
    if (hasErrors) {
      return '#FFA784';
    } else if (isOpen) {
      return '#AED4FB';
    } else {
      return '#e3e9f3';
    }
  }}

  ${({ doesPreviousFieldContainErrorsAndIsOpen }) => {
    if (doesPreviousFieldContainErrorsAndIsOpen) {
      return css`
        border-top: 1px solid #ffa784;
      `;
    }
  }}



  ${({ isFirst }) => {
    if (isFirst) {
      return css`
        border-top-right-radius: 2px;
        border-top-left-radius: 2px;
      `;
    }
  }}
  border-bottom: 0;
  line-height: 36px;
  font-size: 13px;
  font-weight: 500;

  background-color: ${({ hasErrors, isOpen }) => {
    if (hasErrors && isOpen) {
      return '#FFE9E0';
    } else if (isOpen) {
      return '#E6F0FB';
    } else {
      return '#ffffff';
    }
  }}

  ${({ hasErrors, isOpen }) => {
    if (hasErrors) {
      return css`
        color: #f64d0a;
        font-weight: 600;
      `;
    }

    if (isOpen) {
      return css`
        color: #007eff;
        font-weight: 600;
      `;
    }
  }}



  button,
  i,
  img {
    &:active,
    &:focus {
      outline: 0;
    }
  }
  webkit-font-smoothing: antialiased;
`;

const ImgWrapper = styled.div`
  width: 21px;
  height: 21px;
  margin: auto;
  margin-right: 19px;
  border-radius: 50%;
  background-color: ${({ hasErrors, isOpen }) => {
    if (hasErrors) {
      return '#FAA684';
    } else if (isOpen) {
      return '#AED4FB';
    } else {
      return '#e3e9f3';
    }
  }}
  text-align: center;
  line-height: 21px;

  ${({ isOpen }) => !isOpen && 'transform: rotate(180deg)'}
`;

const FormWrapper = styled.div`
  padding-top: 27px;
  padding-left: 15px;
  padding-right: 15px;
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

export { Button, Flex, FormWrapper, GroupCollapseWrapper, ImgWrapper };
