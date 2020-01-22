import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  .row {
    margin-bottom: 4px;
  }

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
