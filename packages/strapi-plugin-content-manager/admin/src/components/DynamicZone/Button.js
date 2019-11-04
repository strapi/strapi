import styled from 'styled-components';

const Button = styled.button`
  height: 36px;
  width: 36px;
  background-color: #f3f4f4;
  border-radius: 50%;
  transform: rotate(-45deg);
  transition: background-color 0.2s linear;
  transition: transform 0.5s ease-in-out;
  text-align: center;

  ${({ isOpen }) => {
    if (isOpen) {
      return `
      transform: rotate(-90deg);
      background-color: #aed4fb;
      `;
    }
  }}
`;

export default Button;
