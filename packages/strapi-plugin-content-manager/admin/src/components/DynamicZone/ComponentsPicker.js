import styled from 'styled-components';

const ComponentsPicker = styled.div`
  display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
`;

export default ComponentsPicker;
