import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  100% {
   transform:rotate(360deg);
  }
`;

const Container = styled.div`
  display: flex;
  justify-content: center;
  > div {
    padding-top: 2.5rem;
    > h4 {
      margin-bottom: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 24px;
    }
    > p {
      margin-top: -1px;
      font-size: 14px;
      color: #919bae;
    }
  }

  .icoContainer {
    padding-top: 0 !important;
    margin-right: 20px;
    font-size: 4.2rem;
    line-height: 9.3rem;
    color: #323740;
  }

  .spinner {
    > i,
    svg {
      animation: ${spin} 4s linear infinite;
    }
  }

  .buttonContainer {
    padding-top: 3.9rem;
    > a {
      height: 30px;
      font-size: 13px;
    }
  }

  .primary {
    min-width: 15rem;
    padding-top: 4px;
    padding-left: 1.6rem;
    padding-right: 1.6rem;
    border-radius: 0.3rem;
    border: none;
    font-family: Lato;
    font-weight: 600;
    -webkit-font-smoothing: antialiased;
    cursor: pointer;
    background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
    color: white;

    > i,
    svg {
      margin-right: 1.3rem;
      padding-top: 1px;
      font-weight: 600;
    }
    &:before {
      content: '\f02d';
      margin-right: 13px;
      font-family: 'FontAwesome';
      font-weight: 600;
      font-size: 1.3rem;
    }

    &:active {
      box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
    }

    &:focus {
      outline: 0;
    }

    &:hover {
      color: white;
    }
  }
`;

export default Container;
