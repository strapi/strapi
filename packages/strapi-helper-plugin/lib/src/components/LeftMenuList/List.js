import styled from 'styled-components';

import colors from '../../assets/styles/colors';

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
    &.active {
      p {
        font-weight: 600;
      }
    }
    p {
      color: ${colors.leftMenu.black};
      font-size: 13px;
      line-height: 16px;
      display: flex;
      justify-content: space-between;
    }
    &:hover {
      text-decoration: none;
    }
  }
`;

export default List;
