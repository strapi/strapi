import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  ${({ isActive }) => {
    if (isActive) {
      return css`
        height: 3rem;
        color: #1c5de7;
        font-weight: 600;
        border-bottom: 2px solid #1c5de7;
        z-index: 99;
      `;
    }
  }}
`;

export default Wrapper;
