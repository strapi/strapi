import { Text } from '@strapi/parts/Text';
import CarretIcon from '../CollapsePropertyMatrix/CarretIcon';

const activeStyle = theme => `
  ${Text} {
    color: ${theme.colors.primary600};
    font-weight: bold;
  }
  ${CarretIcon} {
    display: block;
    color: ${theme.colors.primary600};
  }
`;

export default activeStyle;
