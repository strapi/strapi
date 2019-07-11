import styled from 'styled-components';

import colors from '../../styles/colors';
import sizes from '../../styles/sizes';

const ListWrapper = styled.div`
  background: white;
  font-family: 'Lato';
  box-shadow: 0 2px 4px ${colors.lightGrey};
  position: relative;
  .table-wrapper {
    width: 100%;
    overflow-x: scroll;
  }
  .list-button {
    padding: 1.3rem 3rem 2.5rem 3rem;
    button {
      width: 100%;
    }
  }
  @media (min-width: ${sizes.tablet}) {
    .table-wrapper {
      width: 100%;
      overflow-x: inherit;
    }
  }
`;

export default ListWrapper;
