/*
 * NOTE:
 * This component should be put in the strapi-helper-plugin
 * at some point so the other packages can benefits from the updates
 *
 *
 */

import styled from 'styled-components';

import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  height: 59px;
  line-height: 59px;
  background-color: ${({ theme }) => theme.main.colors.lightGrey};
  color: ${({ theme }) => theme.main.colors.black};
  font-size: ${({ theme }) => theme.main.sizes.fonts.md};
  font-weight: ${({ theme }) => theme.main.fontWeights.bold};
`;

Wrapper.propTypes = themePropTypes;

export default Wrapper;
