import styled from 'styled-components';
import { HeaderSearch as BaseHeaderSearch } from 'strapi-helper-plugin/lib/src';

const HeaderSearch = styled(BaseHeaderSearch)`
  position: relative;
  margin-top: -1px;
  line-height: 5.8rem;
  border-right: none;
  background-color: transparent;
`;

export default HeaderSearch;
