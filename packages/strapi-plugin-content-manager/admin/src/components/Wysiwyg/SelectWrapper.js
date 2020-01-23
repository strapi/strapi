import styled, { css } from 'styled-components';

/* eslint-disable */

const SelectWrapper = styled.div`
  min-width: ${({ isFullScreen }) => (isFullScreen ? '161px' : '115px')}
  margin-left: 15px;
  > select {
    ${({ isFullScreen }) => {
      if (isFullScreen) {
        return css`
          min-width: 110px !important;
        `;
      } else {
        return css`
          margin-right: 5px;
        `;
      }
    }}
    box-shadow: 0 0 0 rgba(0, 0, 0, 0) !important;
  }
`;

export default SelectWrapper;
