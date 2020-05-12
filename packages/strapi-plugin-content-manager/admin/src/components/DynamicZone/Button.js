import styled from 'styled-components';
import PlusButton from '../PlusButton';

const Button = styled(PlusButton)`
  transform: rotate(-90deg);
  transition: background-color 0.1s linear;
  transition: transform 0.1s ease-in-out;
  &:hover {
    background-color: #aed4fb;
    :before,
    :after {
      background-color: #007eff;
    }
  }

  ${({ hasError }) => {
    if (hasError) {
      return `
        background-color: #FAA684;
        :before, :after {
          background-color: #F64D0A;
        }
      `;
    }

    return '';
  }}
  &.isOpen {
    transform: rotate(-45deg);
  }
`;

export default Button;
