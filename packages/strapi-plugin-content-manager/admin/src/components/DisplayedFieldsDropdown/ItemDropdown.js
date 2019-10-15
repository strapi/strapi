import { DropdownItem } from 'reactstrap';
import styled from 'styled-components';

const ItemDropdown = styled(DropdownItem)`
  padding: 0;
  padding-top: 9px;
  &:active,
  :focus {
    background-color: #f7f7f9 !important;
    color: #333740;
    font-weight: 500;
    outline: 0;
  }

  &:hover {
    cursor: pointer;
  }

  label {
    width: 100%;
    outline: none;
  }
`;

export default ItemDropdown;
