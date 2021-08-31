import { Collapse } from 'reactstrap';
import styled from 'styled-components';

const ToggleUl = styled(Collapse)`
  padding: 0 15px;
  background-color: #fff;
  list-style: none;
  font-size: 13px;
  > li {
    label {
      cursor: pointer;
    }

    .check-wrapper {
      z-index: 9;
      > input {
        z-index: 1;
      }
    }
  }
`;

export default ToggleUl;
