import styled from 'styled-components';

const ButtonWrapper = styled.div`
  padding-top: 2rem;
  .primary {
    min-width: 15rem;
    padding-top: 4px;
    padding-left: 1.6rem;
    padding-right: 1.6rem;
    -webkit-font-smoothing: antialiased;
    border-radius: 0.3rem;
    border: 0;
    font-family: Lato;
    font-weight: 500;
    color: white;
    cursor: pointer;
    background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);

    &:before {
      content: '\f02d';
      font-family: 'FontAwesome';
      font-weight: 600;
      font-size: 1.3rem;
      margin-right: 13px;
    }
    > i,
    > svg {
      margin-right: 1.3rem;
      font-weight: 600;
      padding-top: 1px;
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

export default ButtonWrapper;
