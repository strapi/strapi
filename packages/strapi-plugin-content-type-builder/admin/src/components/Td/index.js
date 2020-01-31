import styled from 'styled-components';
/* eslint-disable indent */

const Td = styled.td`
  &::before {
    content: '&';
    width: 5px;
    height: calc(100% - 15px);
    position: absolute;
    top: -7px;
    left: 45px;
    color: transparent;

    ${({ isFromDynamicZone, isChildOfDynamicZone }) => {
      if (isChildOfDynamicZone) {
        return `
          z-index: -1;
          background-color: transparent !important;
        `;
      }

      if (isFromDynamicZone) {
        return `
          background-color: #AED4FB !important;
        `;
      }

      return `
        background-color: #f3f4f4 !important;
      `;
    }}

    border-radius: 3px;
  }
`;

export default Td;
