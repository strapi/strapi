import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  ${({ isActive }) => {
    if (isActive) {
      return css`
        height: 3rem;
        color: #007eff;
        font-weight: 600;
        border-bottom: 2px solid #007eff;
        z-index: 99;
      `;
    }

    return '';
  }}
`;

export default Wrapper;
