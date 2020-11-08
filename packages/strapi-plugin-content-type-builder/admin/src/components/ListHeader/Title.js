/**
 *
 * Title
 *
 */

import styled from 'styled-components';
import { colors } from 'strapi-helper-plugin';

const Title = styled.p`
  margin-bottom: 0;
  color: ${colors.blueTxt};
  font-family: 'Lato';
  font-size: 1.8rem;
  font-weight: bold;
  line-height: 2.2rem;
`;

export default Title;
