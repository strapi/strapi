import styled from 'styled-components';

import { sizes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  min-height: calc(100vh - ${sizes.header.height});
  .centered {
    position: fixed;
    top: calc(50% - 13px);
    right: calc(50% - 13px);
  }
`;

export default Wrapper;
