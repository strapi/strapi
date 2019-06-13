/**
 *
 * StyledViewContainer
 *
 */

import styled from 'styled-components';

import colors from '../../assets/styles/colors';
import sizes from '../../assets/styles/sizes';

const StyledViewContainer = styled.div`
  min-height: calc(100vh - ${sizes.header.height});
  background-color: ${colors.greyOpacity};

  .components-container {
    padding: 1.8rem 1.5rem 0 1.5rem;
  }
`;

export default StyledViewContainer;
