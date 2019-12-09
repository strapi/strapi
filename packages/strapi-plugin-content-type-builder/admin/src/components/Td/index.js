import styled from 'styled-components';

const Td = styled.td`
  &::before {
    content: '&';
    width: 5px;
    height: calc(100% - 15px);
    position: absolute;
    top: -7px;
    left: 45px;
    color: transparent;
    background-color: ${({ isFromDynamicZone }) =>
      isFromDynamicZone ? '#AED4FB' : '#f3f4f4'} !important;

    border-radius: 3px;
  }
`;

export default Td;
