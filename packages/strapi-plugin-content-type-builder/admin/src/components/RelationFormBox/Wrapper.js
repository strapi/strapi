import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  width: 20rem;
  height: 13.8rem;
  flex-shrink: 0;
  background-color: ${colors.relations.boxBkgd};
  box-shadow: 0 1px 2px ${colors.relations.boxShadow};
  border-radius: 2px;
  .box-header {
    height: 3.6rem;
    line-height: 3.6rem;
    text-transform: capitalize;
    background-color: ${colors.relations.headerBkgd};
    &,
    .dropdown-toggle p {
      text-align: center;
      font-size: 1.4rem;
      font-weight: 700;
    }
    i,
    svg {
      margin-right: 8px;
    }
  }
  .box-body {
    padding: 0 15px;
    padding-top: 1rem;
  }
`;

export default Wrapper;
