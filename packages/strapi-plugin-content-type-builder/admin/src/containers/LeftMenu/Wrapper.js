import styled from 'styled-components';

import { colors, sizes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  width: 100%;
  min-height: calc(100vh - ${sizes.header.height});
  background-color: ${colors.leftMenu.mediumGrey};
  padding-top: 3.1rem;
  padding-left: 2rem;
  padding-right: 2rem;
`;

export default Wrapper;
