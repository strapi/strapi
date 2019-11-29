import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;

  ${({ isFromDynamicZone }) => {
    if (isFromDynamicZone) {
      return `background-color: #fff`;
    }
  }}
`;

export default Wrapper;
