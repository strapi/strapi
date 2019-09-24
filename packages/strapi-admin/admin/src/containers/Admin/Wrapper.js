import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  overflow-x: hidden;
  p,
  span {
    font-family: Lato;
  }

  .adminPageRightWrapper {
    width: calc(100% - #{$left-menu-width});
  }
`;

export default Wrapper;
