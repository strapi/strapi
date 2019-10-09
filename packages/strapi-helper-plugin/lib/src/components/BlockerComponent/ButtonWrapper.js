import styled from 'styled-components';

const ButtonWrapper = styled.div`
  padding-top: 2rem;

  .primary {
    border-radius: 0.3rem;
    border: none;
    font-weight: 500;
    min-width: 15rem;
    background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
    -webkit-font-smoothing: antialiased;
    color: white;
    &:active {
      box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
    }
    padding-top: 4px;
    padding-left: 1.6rem;
    padding-right: 1.6rem;
    &:before {
      content: '\f02d';
      font-family: 'FontAwesome';
      font-weight: 600;
      font-size: 1.3rem;
      margin-right: 13px;
    }
    cursor: pointer;
    font-family: Lato;
    -webkit-font-smoothing: antialiased;
    &:focus {
      outline: 0;
    }
    > i {
      margin-right: 1.3rem;
      font-weight: 600;
      padding-top: 1px;
    }
    &:hover {
      color: white;
    }
  }
`;

export default ButtonWrapper;
