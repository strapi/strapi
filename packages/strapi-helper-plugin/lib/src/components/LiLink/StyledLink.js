import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Layout from '../../assets/icons/icon_layout.svg';
import LayoutHover from '../../assets/icons/icon_layout_hover.svg';

const StyledLink = styled(Link)`
  display: block;
  width: 100%;
  text-decoration: none;
  span,
  i {
    color: #333740;
  }
  span {
    font-size: 13px;
  }
  i {
    width: 13px;
    height: 11px;
    margin-right: 10px;
  }
  .layout {
    display: inline-block;
    background-image: url(${Layout});
  }
  &:hover {
    text-decoration: none;
    span,
    i {
      color: #007eff;
    }
    .layout {
      background-image: url(${LayoutHover});
    }
  }
`;

export default StyledLink;
