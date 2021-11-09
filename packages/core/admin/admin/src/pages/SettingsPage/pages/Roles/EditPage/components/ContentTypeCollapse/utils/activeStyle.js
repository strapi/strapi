import { Typography } from '@strapi/design-system/Typography';
import CarretIcon from '../CollapsePropertyMatrix/CarretIcon';

const activeStyle = theme => `
  ${Typography} {
    color: ${theme.colors.primary600};
    font-weight: bold;
  }
  ${CarretIcon} {
    display: block;
    path {
      fill: ${theme.colors.primary600}
    };
  }
`;

export default activeStyle;
