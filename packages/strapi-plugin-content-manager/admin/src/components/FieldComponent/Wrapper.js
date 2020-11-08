import styled from 'styled-components';

/* eslint-disable indent */
const Wrapper = styled.div`
  position: relative;

  ${({ isFromDynamicZone }) => {
    if (isFromDynamicZone) {
      return `
        background-color: #fff;
      `;
    }

    return '';
  }}
`;

export default Wrapper;
