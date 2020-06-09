import styled from 'styled-components';

const LoaderWrapper = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1140;
  background: ${({ theme }) => theme.main.colors.white};
`;

export default LoaderWrapper;
