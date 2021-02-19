import styled from 'styled-components';

const P = styled.p`
  margin-top: 5px;
  font-size: 13px;
  font-weight: 500;

  .bold {
    font-weight: 700;
  }

  ${({ isDragging, theme }) => isDragging && `color: ${theme.main.colors.mediumBlue};`}
`;

export default P;
