import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  min-height: calc(100vh - 6rem);
  background: ${colors.lightGrey};
`;

export default Wrapper;
