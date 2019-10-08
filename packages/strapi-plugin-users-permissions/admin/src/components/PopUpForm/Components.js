import styled from 'styled-components';

const Wrapper = styled.div`
  .modalHeader {
    margin: 0 2.9rem;
    padding: 1.4rem 0 2.8rem 0;
    border-bottom: 1px solid #f6f6f6;
    position: relative;
    > button {
      margin-right: -2.5rem !important;
      color: #c3c5c8;
      opacity: 1;
      font-size: 1.8rem;
      font-weight: 100;
      z-index: 999;
      &:hover,
      &:focus {
        color: #c3c5c8;
        opacity: 1;
        outline: 0 !important;
      }
      > span {
        display: none;
      }
      &:before {
        -webkit-font-smoothing: antialiased;
        content: '\F00d';
        font-family: 'FontAwesome';
        font-weight: 400;
        font-size: 1.2rem;
        margin-right: 10px;
      }
    }
  }

  .modalBody {
    padding: 2.2rem 1.4rem 0 1.4rem;
  }

  .modalFooter {
    padding: 1.2rem 1rem 2.8rem 1rem;
    border: none;
    > button {
      height: 3rem;
      position: relative;
      border-radius: 0.3rem;
      text-transform: capitalize;
      margin-right: 1.8rem;
      cursor: pointer;
      font-family: Lato;
      &:focus {
        outline: 0;
      }
      > i {
        margin-right: 1.3rem;
      }
      &:hover {
        &::after {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          border-radius: 0.3rem;
          content: '';
          opacity: 0.1;
          background: #ffffff;
        }
      }
      &.primary {
        width: 15rem;
        height: 3rem;
        margin-left: 1.9rem !important;
        cursor: pointer;
        font-family: Lato;
        border: none !important;
        font-family: Lato !important;
        line-height: 1.6rem;
        font-weight: 600;
        border-radius: 3px;
        background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
        -webkit-font-smoothing: antialiased;
        color: white !important;
        &:hover,
        &:active {
          border: none !important;
          background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
          color: white;
        }
        &:focus {
          outline: 0;
        }
      }
      &.secondary {
        position: relative;
        min-width: 100px;
        height: 3rem;
        cursor: pointer;
        background-color: transparent;
        border: 0.1rem solid #f64d0a;
        border-radius: 3px;
        color: #f64d0a;
        font-family: Lato;
        &:hover,
        &:active {
          color: #f64d0a;
          background-color: white;
          border: 0.1rem solid #f64d0a;
        }
      }
    }
  }
`;

const Header = styled.div`
  position: absolute;
  top: 0;
  width: 100%;
  display: flex;
  padding: 1.6rem 2.9rem 0 2.9rem;
  font-size: 1.8rem;
  font-weight: bold;
`;

const ProviderContainer = styled.div`
  > div {
    &:last-child {
      > input {
        &:disabled {
          background-color: #fafafb !important;
        }
      }
    }
  }
`;

const Separator = styled.div`
  width: 100%;
  margin: 14px 15px 20px 15px;
  border-bottom: 2px solid #f6f6f6;
`;

export { Header, ProviderContainer, Separator, Wrapper };
