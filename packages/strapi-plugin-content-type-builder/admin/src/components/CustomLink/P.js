import styled from 'styled-components';
import { colors } from 'strapi-helper-plugin';

const P = styled.p`
  color: ${colors.blue};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  text-align: left;
  > svg {
    margin-right: 7px;
    vertical-align: initial;
    -webkit-font-smoothing: subpixel-antialiased;
  }
`;

export default P;
