import styled from 'styled-components';

// TODO refactor with DS
const Overlay = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1140;
  &:before {
    content: '';
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: ${({ theme }) => theme.colors.neutral200};
    opacity: 0.8;
  }

  > div {
    position: fixed;
    top: 11.5rem;
    left: 50%;
    margin-left: -17.5rem;
    z-index: 1100;
  }
`;

export default Overlay;
