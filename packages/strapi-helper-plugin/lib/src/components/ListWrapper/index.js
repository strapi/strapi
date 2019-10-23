import styled from 'styled-components';

import colors from '../../styles/colors';
import sizes from '../../styles/sizes';

const ListWrapper = styled.div`
  position: relative;
  font-family: 'Lato';
  box-shadow: 0 2px 4px ${colors.lightGrey};
  .table-wrapper {
    width: 100%;
    overflow-x: scroll;
  }
  .list-button {
    padding: 1.4rem 3rem 3rem 3rem;
    background-color: white;
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
