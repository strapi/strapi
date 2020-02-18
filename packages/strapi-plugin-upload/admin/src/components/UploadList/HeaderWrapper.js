import styled from 'styled-components';
import { HeaderNavWrapper } from 'strapi-helper-plugin';

const Wrapper = styled(HeaderNavWrapper)`
  padding-top: 27px;
  font-size: 12px;

  .assets-selected {
    padding-top: 7px;
    line-height: 18px;
  }
  .infos {
    color: #9ea7b8;
  }
`;

export default Wrapper;
