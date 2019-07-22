import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const RelationsWrapper = styled.div`
  width: 100%;
  display: flex;
  padding: 2.7rem 1.5rem 3.3rem 1.5rem;
  justify-content: space-between;
  > div {
    width: 200px;
    background-color: ${colors.relations.boxBkgd};
    box-shadow: 0 1px 2px ${colors.relations.boxShadow};
  }
`;

export default RelationsWrapper;
