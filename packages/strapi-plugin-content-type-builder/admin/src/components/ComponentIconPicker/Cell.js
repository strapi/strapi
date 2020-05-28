import styled from 'styled-components';

/* eslint-disable indent */
const Cell = styled.div`
  width: 54px;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  cursor: pointer;

  ${({ isSelected }) => {
    if (isSelected) {
      return `
        &::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 6px;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          background-color: #AED4FB;
          z-index: 1;
        }
      `;
    }

    return '';
  }}

  > svg {
    z-index: 9;
    font-size: 18px;
    color: ${({ isSelected }) => (isSelected ? '#007EFF' : '#b4b6ba')};
  }
`;

export default Cell;
