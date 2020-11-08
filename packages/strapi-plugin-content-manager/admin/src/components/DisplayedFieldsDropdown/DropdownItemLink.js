import { DropdownItem } from 'reactstrap';
import styled from 'styled-components';

const DropdownItemLink = styled(DropdownItem)`
  border-bottom: 1px solid #f7f8f8;
  padding: 0.3rem 1.5rem 0.8rem 1.5rem;
  &:hover {
    background-color: #fff;
  }
`;

export default DropdownItemLink;
