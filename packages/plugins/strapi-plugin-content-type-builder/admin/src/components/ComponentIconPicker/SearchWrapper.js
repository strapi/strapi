import styled from 'styled-components';
import { colors } from 'strapi-helper-plugin';

const SearchWrapper = styled.div`
  position: relative;
  margin-top: -2px;
  &::after {
    display: block;
    content: '';
    height: 2px;
    width: calc(100% - 20px);
    background: ${colors.leftMenu.lightGrey};
  }
  > svg {
    position: absolute;
    bottom: 15px;
    left: 0;
    font-size: 11px;
  }
  button {
    position: absolute;
    top: 1px;
    right: 0;
    padding: 5px 0 0px 5px;
    line-height: 11px;
    outline: 0;
    i,
    svg {
      font-size: 11px;
    }
  }
`;

export default SearchWrapper;
