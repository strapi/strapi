import styled, { css } from 'styled-components';

const Flex = styled.div`
  display: flex;
  > button {
    cursor: pointer;
    padding-top: 0;
  }
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

const Wrapper = styled(Flex)`
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

const FullWidthCarret = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 30px;
  width: 100%;
  padding: 0 5px;
  margin-bottom: 6px;
  border-radius: 2px;
  > div {
    width: 100%;
    height: 2px;
    background: #007eff;
  }
`;

export { Flex, FullWidthCarret, ImgWrapper, Wrapper };
