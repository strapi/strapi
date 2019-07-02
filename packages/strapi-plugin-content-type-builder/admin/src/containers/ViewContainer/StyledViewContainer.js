/**
 *
 * StyledViewContainer
 *
 */

import styled from 'styled-components';

import { colors, sizes } from 'strapi-helper-plugin';

const StyledViewContainer = styled.div`
  min-height: calc(100vh - ${sizes.header.height});
  background-color: ${colors.greyOpacity};

  .components-container {
    padding: 1.8rem 1.5rem 0 1.5rem;
  }
`;

export default StyledViewContainer;
