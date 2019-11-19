import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  padding-top: 14px;

  ${({ isFromDynamicZone }) => {
    if (isFromDynamicZone) {
      return `background-color: #fff`;
    }
  }}
`;

export default Wrapper;
