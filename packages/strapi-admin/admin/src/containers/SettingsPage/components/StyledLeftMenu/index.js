import styled from 'styled-components';
import { LeftMenu } from 'strapi-helper-plugin';

// Min height and height need to be unset to avoid the double overflow on the settings page.
const StyledLeftMenu = styled(LeftMenu)`
  > div {
    margin-bottom: 27px;
  }
  min-height: unset;
  height: unset;
`;

export default StyledLeftMenu;
