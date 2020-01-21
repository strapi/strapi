import styled, { css } from 'styled-components';

const Div = styled.div`
  padding-left: 0;
  font-size: 13px;
  &:active,
  :focus {
    outline: 0 !important;
  }
  > div {
    height: 27px;
    margin: 0 !important;
    padding-left: 15px;
    line-height: 27px;
    &:active,
    :focus {
      outline: 0 !important;
    }
  }
`;

const Label = styled.label`
  margin: 0;
  margin-left: 9px;
  color: #333740 !important;
  cursor: pointer;
  > input {
    display: none;
    margin-right: 9px;
  }

  &:before {
    content: '';
    position: absolute;
    left: 15px;
    top: 7px;
    width: 14px;
    height: 14px;
    border: 1px solid rgba(16, 22, 34, 0.15);
    background-color: #fdfdfd;
    border-radius: 3px;
  }

  ${({ value }) => {
    if (value === true) {
      return css`
        font-weight: 500;
        &:after {
          content: '\f00c';
          position: absolute;
          top: 1px;
          left: 17px;
          font-size: 10px;
          font-family: 'FontAwesome';
          font-weight: 100;
          color: #1c5de7;
          transition: all 0.2s;
        }
      `;
    }

    return '';
  }}
`;

export { Div, Label };
