import styled from 'styled-components';

const Wrapper = styled.div`
  padding-top: 9px;
  > button {
    width: 5.3rem;
    height: 3.4rem;
    padding: 0;
    border: 1px solid #e3e9f3;
    border-radius: 0.25rem;
    color: #ced3db;
    background-color: white;
    box-shadow: 0px 1px 1px rgba(104, 118, 142, 0.05);
    font-weight: 600;
    font-size: 1.2rem;
    letter-spacing: 0.1rem;
    font-family: Lato;
    line-height: 3.4rem;
    cursor: pointer;
    &:first-of-type {
      border-right: none;
    }
    &:nth-of-type(2) {
      border-left: none;
    }
    &:hover {
      z-index: 0 !important;
      color: #ced3db;
    }
    &:focus {
      outline: 0;
      box-shadow: 0 0 0;
    }
    &:disabled {
      cursor: not-allowed;
    }
  }

  .gradientOff {
    background-color: #f64d0a;
    color: white !important;
    z-index: 0 !important;

    &:active,
    :hover {
      box-shadow: inset -1px 1px 3px rgba(0, 0, 0, 0.1);
      background-color: #f64d0a;
      color: white !important;
      z-index: 0 !important;
    }
  }

  .gradientOn {
    background-color: #007eff;
    color: white !important;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.1);
    &:active,
    :hover {
      background-color: #007eff;
      color: white !important;
      z-index: 0 !important;
    }
  }

  .error {
    > button {
      &:first-child {
        border: 1px solid #ff203c !important;
        border-right: 0 !important;
      }
      &:last-child {
        border: 1px solid #ff203c !important;
        border-left: 0 !important;
      }
    }
  }
`;

export default Wrapper;
