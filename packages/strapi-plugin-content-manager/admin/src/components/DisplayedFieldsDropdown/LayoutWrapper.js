import styled from 'styled-components';
import { Link } from 'react-router-dom';

const LayoutWrapper = styled(Link)`
  display: block;
  width: 100%;
  text-decoration: none;
  color: #333740;
  font-size: 13px;
  svg {
    margin-right: 10px;
    vertical-align: middle;
  }
  &:hover {
    text-decoration: none;
    span {
      color: #007eff;
    }
    svg {
      g {
        fill: #007eff;
      }
    }
  }
`;

export default LayoutWrapper;
