import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  padding-top: 0;
  margin-top: -4px;

  ${({ isFromDynamicZone }) => {
    if (isFromDynamicZone) {
      return `background-color: #fff`;
    }
  }}
`;

export default Wrapper;
