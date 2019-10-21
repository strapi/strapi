/**
 *
 * StyledPluginHeader
 *
 */

import styled from 'styled-components';

const StyledPluginHeader = styled.div`
  margin-bottom: 30px;

  ${props =>
    props.bottom &&
    `
    margin-top: 30px;
    margin-bottom: 50px;
  `}

  .justify-content-end {
    display: flex;
  }
`;

export default StyledPluginHeader;
