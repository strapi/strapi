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

const EmptyGroup = styled.div`
  height: 72px;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  border-bottom: 0;
  line-height: 73px;
  text-align: center;
`;

const P = styled.p`
  color: #9ea7b8;
  font-size: 13px;
  font-weight: 500;
`;

const NonRepeatableWrapper = styled.div`
  margin: 0 10px !important;
  padding: 0 20px !important;

  ${({ isEmpty }) => {
    if (isEmpty) {
      return css`
        position: relative;
        height: 108px;
        margin-bottom: 21px !important;
        background-color: #fafafb;
        text-align: center;

        > div {
          position: absolute;
          top: 30px;
          left: calc(50% - 18px);
          line-height: 36px;
          height: 36px;
          width: 36px;
          border-radius: 50%;
          background-color: #f3f4f4;
          cursor: pointer;
          &:before {
            content: '\f067';
            font-family: FontAwesome;
            font-size: 15px;
            color: #b4b6ba;
          }
        }

        &:hover {
          background-color: #e6f0fb;

          > div {
            background-color: #aed4fb;
            &:before {
              content: '\f067';
              font-family: FontAwesome;
              font-size: 15px;

              color: #007eff;
            }
          }
        }
      `;
    }

    return css`
      padding-top: 21px !important;
      background-color: #f7f8f8;
      margin-bottom: 18px !important;
    `;
  }}
`;

const ResetGroup = styled.div`
  position: absolute;
  top: 0;
  right: 10px;
  display: flex;

  cursor: pointer;
  color: #4b515a;

  > span {
    margin-right: 10px;
    display: none;
  }

  &:hover {
    > div {
      background-color: #faa684;
    }
    color: #f64d0a;
    > span {
      display: initial;
    }
  }

  > div {
    width: 24px;
    height: 24px;
    background-color: #f3f4f4;
    text-align: center;
    border-radius: 2px;
    &:after {
      content: '\f1f8';
      font-size: 14px;
      font-family: FontAwesome;
    }
  }
`;

export { Button, EmptyGroup, FormWrapper, NonRepeatableWrapper, P, ResetGroup };
