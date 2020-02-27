import styled from 'styled-components';

const Button = styled.button`
  margin-top: 11px;
  color: #b3b5b9;
  font-weight: 500;
  font-size: 11px;

  &:active {
    outline: 0;
  }

  &:focus {
    outline: 0;
  }

  > svg {
    margin-top: -1px;
    margin-left: 10px;
  }
`;

export default Button;
