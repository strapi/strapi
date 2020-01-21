import styled, { css } from 'styled-components';

/* eslint-disable */

const Wrapper = styled.div`
  min-height: 38px;
  border-left: ${props => props.borderLeft && '3px solid #007EFF'};
  padding-left: ${props => (props.borderLeft ? '10px' : '13px')};
  margin-bottom: 0px !important;
`;

const InputWrapper = styled.div`
  display: flex;
  input,
  select {
    margin: 0px 5px !important;
  }
`;

const Button = styled.button`
  display: flex;
  justify-content: center;
  height: 20px;
  width: 20px;
  margin: 8px 5px 0px 0px;
  border-radius: 50%;
  border: 1px solid #e3e9f3;
  cursor: pointer;
  &:focus {
    outline: 0;
  }
  ${({ isRemoveButton }) => {
    if (isRemoveButton) {
      return css`
        &:after {
          content: '\f068';
          font-family: FontAwesome;
          font-size: 12px;
          line-height: 18px;
          color: #007eff;
        }
      `;
    }
    return css`
      &:after {
        content: '\f067';
        font-family: FontAwesome;
        font-size: 12px;
        line-height: 18px;
        color: #007eff;
      }
    `;
  }}
`;

const InputWrapperDate = styled.div`
  margin-right: 10px;
  span {
    left: 5px;
  }
  .rc-input-number-handler-wrap {
    right: -5px !important;
  }
  .rc-input-number-input-wrap {
    max-width: 210px;
    overflow: visible;
  }
  > div {
    width: 210px;
  }

  ${({ type }) => {
    if (type === 'datetime') {
      return `
      > div {
        width: 300px;
      }

      `;
    }
  }}
`;

const Input = styled.input`
  height: 3.4rem;
  margin-top: 0.9rem;
  padding-left: 1rem;
  background-size: 0 !important;
  border: 1px solid #e3e9f3;
  border-radius: 0.25rem;
  line-height: 3.4rem;
  font-size: 1.3rem;
  font-family: 'Lato' !important;
  box-shadow: 0px 1px 1px rgba(104, 118, 142, 0.05);
`;
export { Button, InputWrapper, Wrapper, InputWrapperDate, Input };
