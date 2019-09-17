import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  overflow-x: hidden;

  .adminPageRightWrapper {
    width: calc(100% - #{$left-menu-width});
  }
`;

export default Wrapper;
