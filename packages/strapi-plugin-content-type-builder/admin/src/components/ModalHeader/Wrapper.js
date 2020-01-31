import styled from 'styled-components';
import { Dropdown } from 'reactstrap';

const Wrapper = styled(Dropdown)`
  .dropdown-menu {
    top: 8px !important;
    box-shadow: 0 2px 4px #e3e9f3;
    border: 0;
  }
`;

export default Wrapper;
