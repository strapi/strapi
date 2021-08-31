import styled from 'styled-components';
import { NavLink } from 'react-router-dom';

const Link = styled(NavLink)`
  display: flex;
  justify-content: space-between;
  position: relative;
  padding-left: 30px;
  height: 34px;
  border-radius: 2px;
  &.active {
    background-color: #e9eaeb;
    > p {
      font-weight: 600;
    }
    > svg {
      color: #2d3138;
    }
  }
  &:hover {
    text-decoration: none;
  }
`;

export default Link;
