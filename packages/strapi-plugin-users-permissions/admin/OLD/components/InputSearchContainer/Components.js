import styled from 'styled-components';

/* stylelint-disable */

const Wrapper = styled.div`
  min-width: 200px;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;

  label {
    margin-bottom: 0;
    font-weight: 500;
  }

  input {
    height: 3.4rem;
    margin-top: 0.9rem;
    padding-left: 1rem;
    background-size: 0 !important;
    border: 1px solid #e3e9f3;
    border-left: 0;
    border-bottom: 0px;
    border-radius: 0.25rem;
    border-bottom-right-radius: 0;
    line-height: 3.4rem;
    font-size: 1.3rem;
    font-family: 'Lato' !important;
    box-shadow: 0px 2px 1px rgba(104, 118, 142, 0.05);
    &:focus {
      border-color: #78caff;
    }
  }
`;

const Addon = styled.div`
  width: 3.2rem;
  height: 3.4rem;
  margin-top: 0.9rem;
  background-color: rgba(16, 22, 34, 0.02);
  border: 1px solid #e3e9f3;
  border-right: 0;
  border-bottom: 0px;
  border-radius: 0.25rem;
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  color: #b3b5b9;
  line-height: 3.2rem;
  font-size: 1.3rem;
  font-family: 'Lato';
  font-weight: 600 !important;
  text-transform: capitalize;
  -moz-appearance: none;
  -webkit-appearance: none;
  box-shadow: 0px 2px 1px rgba(104, 118, 142, 0.05);
  i,
  svg {
    margin-left: 2px;
    color: #b3b5b9;
    font-weight: 900;
    font-size: 14px;
    font-family: 'FontAwesome';
    font-style: initial;
    -webkit-font-smoothing: antialiased;
  }
  &.focus {
    border-color: #78caff;
    border-right: 0;
  }
`;

const List = styled.div`
  height: 16.3rem;
  overflow-y: auto;
  border: 1px solid #e3e9f3;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
  border-top: none;
  border-radius: 0.25rem;
  > ul {
    list-style: none;
    padding: 1px 0;
  }
  &.focused {
    border-color: #78caff;
  }
`;

export { Addon, List, Wrapper };
