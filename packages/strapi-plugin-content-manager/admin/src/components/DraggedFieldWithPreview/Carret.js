import styled from 'styled-components';

/* eslint-disable indent */
const Carret = styled.div`
  position: absolute;
  ${({ right }) => {
    if (right) {
      return `
      right: -4px;
    `;
    }

    return `
    left: -1px;
  `;
  }}
  height: 100%;
  width: 2px;
  margin-right: 3px;
  border-radius: 2px;
  background: #007eff;
`;

export default Carret;
