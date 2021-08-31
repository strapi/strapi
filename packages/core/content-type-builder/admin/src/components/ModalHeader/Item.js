import styled from 'styled-components';
import { DropdownItem } from 'reactstrap';

const Item = styled(DropdownItem)`
  display: flex;
  padding-left: 10px;
  padding-right: 10px;
  color: #3b3b3b;
  font-weight: 600;
  font-size: 14px;
  &:active,
  &:focus,
  &:hover {
    background-color: transparent;
    outline: 0;
  }
`;

export default Item;
