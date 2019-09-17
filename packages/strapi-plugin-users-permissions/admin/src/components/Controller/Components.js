import styled from 'styled-components';

const Wrapper = styled.div`
  padding: 1px 43px 0 28px;
  background: #ffffff;
  opacity: none;
  -webkit-font-smoothing: antialiased;
  .checkbox-wrapper {
    font-size: 13px;
    > div {
      margin-bottom: 0 !important;
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  font-size: 13px;
  font-weight: 600;
  line-height: 16px;
  text-transform: capitalize;
`;

const Label = styled.label`
  margin-right: 0px;
  margin-left: 10px;
  font-weight: 400 !important;
  cursor: pointer;

  > input {
    display: none;
    margin-right: 9px;
  }

  &:before {
    content: '';
    position: absolute;
    left: 0px;
    top: 1px;
    width: 14px;
    height: 14px;
    border: 1px solid rgba(16, 22, 34, 0.15);
    background-color: #fdfdfd;
    border-radius: 3px;
  }
  &.checked {
    &:after {
      content: '\f00c';
      position: absolute;
      top: 0px;
      left: 2px;
      font-size: 10px;
      font-family: 'FontAwesome';
      font-weight: 100;
      color: #1c5de7;
      transition: all 0.2s;
    }
  }
  &.some-checked {
    &:after {
      content: '\f068';
      position: absolute;
      top: 0px;
      left: 3px;
      font-size: 10px;
      font-family: 'FontAwesome';
      font-weight: 100;
      color: #1c5de7;
    }
  }
`;

const Separator = styled.div`
  height: 1px;
  flex-grow: 2;
  margin-top: 8px;
  margin-right: 15px;
  margin-left: 15px;
  background-color: #f6f6f6;
`;

export { Header, Label, Separator, Wrapper };
