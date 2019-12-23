import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const Search = styled.input`
  width: 100%;
  padding: 0 21px;
  outline: 0;
  color: ${colors.leftMenu.black};
`;

export default Search;
