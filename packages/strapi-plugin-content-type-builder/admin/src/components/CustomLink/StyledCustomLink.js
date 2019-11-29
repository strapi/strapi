/**
 *
 * StyledCustomLink
 *
 */

import styled from 'styled-components';

// Prepare for theming
const colors = {
  blue: '#1c8fe5',
};

const StyledCustomLink = styled.div`
  p {
    color: ${colors.blue};
    i,
    svg {
      -webkit-font-smoothing: subpixel-antialiased;
    }
  }
  button {
    cursor: pointer;
  }
`;

export default StyledCustomLink;
