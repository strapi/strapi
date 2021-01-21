import styled from 'styled-components';

const Button = styled.button`
  margin-top: 8px;

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
