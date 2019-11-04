import styled from 'styled-components';

const Button = styled.button`
  height: 36px;
  width: 36px;
  background-color: ${({ isOpen }) => (isOpen ? '#aed4fb' : '#f3f4f4')};
  border-radius: 50%;
`;

export default Button;
