import styled from 'styled-components';

const Bar = styled.div`
  height: 10px;
  width: ${({ isSmall }) => (isSmall ? '64px' : '110px')};
  margin-top: ${({ isSmall }) => (isSmall ? '15px' : '8px')};
  background: #f6f6f6;
`;

export default Bar;
