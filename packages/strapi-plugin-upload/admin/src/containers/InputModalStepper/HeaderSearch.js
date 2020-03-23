import styled from 'styled-components';
import { HeaderSearch as BaseHeaderSearch } from 'strapi-helper-plugin';

const HeaderSearch = styled(BaseHeaderSearch)`
  position: relative;
  background-color: transparent;
  border-right: none;
`;

export default HeaderSearch;
