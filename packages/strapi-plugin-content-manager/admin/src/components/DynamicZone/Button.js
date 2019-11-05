import styled from 'styled-components';
import PlusButton from '../PlusButton';

const Button = styled(PlusButton)`
  transform: rotate(-45deg);
  transition: background-color 0.2s linear;
  transition: transform 0.2s ease-in-out;

  ${({ isOpen }) => {
    if (isOpen) {
      return `
        transform: rotate(-90deg);
        background-color: #aed4fb;
        :before, :after {
          background-color: #007eff;
        }
      `;
    }
  }}
`;

export default Button;
