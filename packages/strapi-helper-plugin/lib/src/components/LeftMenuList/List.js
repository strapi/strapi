import styled from 'styled-components';

import colors from '../../assets/styles/colors';

const List = styled.ul`
  margin-bottom: 0;
  padding-left: 0;
  max-height: 178px;
  overflow-y: scroll;
  li {
    position: relative;
    margin-bottom: 2px;
    &:last-of-type {
      margin-bottom: 0;
    }
  }
  a {
    display: block;
    padding-left: 30px;
    height: 34px;
    border-radius: 2px;
    &::before {
      content: '•';
      position: absolute;
      top: calc(50% - 2px);
      left: 15px;
      font-weight: bold;
      display: block;
      width: 0.5em;
      height: 0.5em;
      color: ${colors.leftMenu.darkGrey};
      line-height: 5px;
      font-size: 10px;
    }
    p {
      color: ${colors.leftMenu.black};
      font-size: 13px;
      line-height: 34px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 0;
    }
    &.active {
      background-color: #e9eaeb;
      p {
        font-weight: 600;
      }
      &::before {
        color: ${colors.leftMenu.black};
      }
    }
    &:hover {
      text-decoration: none;
    }
  }
`;

export default List;
