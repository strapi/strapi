import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const List = styled.ul`
  padding-left: 15px;
  margin-bottom: 0;
  max-height: 242px;
  overflow-y: scroll;
  li {
    position: relative;
    padding-left: 15px;
    margin-bottom: 20px;
    &::before {
      content: '•';
      position: absolute;
      top: calc(50% - 2px);
      left: 0;
      font-weight: bold;
      display: block;
      width: 0.5em;
      height: 0.5em;
      color: ${colors.leftMenu.darkGrey};
      line-height: 5px;
      font-size: 10px;
    }
    &:last-of-type {
      margin-bottom: 0;
    }
  }
  a {
    display: block;
    p {
      color: ${colors.leftMenu.black};
      font-size: 13px;
      line-height: 16px;
    }
    &:hover {
      text-decoration: none;
    }
  }
`;

export default List;
