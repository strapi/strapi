import styled from 'styled-components';

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
export { InputWrapper, Wrapper, InputWrapperDate, Input };
