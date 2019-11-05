import styled from 'styled-components';

const ComponentsPicker = styled.div`
  display: flex;
  max-height: ${({ isOpen }) => (isOpen ? '260px' : '0')};
  transition: max-height 0.2s ease-out;
  overflow: hidden;
`;

export default ComponentsPicker;
