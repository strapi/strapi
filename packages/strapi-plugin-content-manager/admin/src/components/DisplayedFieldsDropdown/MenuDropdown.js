import styled from 'styled-components';
import { DropdownMenu } from 'reactstrap';

/* eslint-disable indent */
const MenuDropdown = styled(DropdownMenu)`
  min-width: 230px;
  padding-top: 9px;
  padding-bottom: 5px !important;
  border-top-right-radius: 0 !important;
  border: 1px solid #e3e9f3;
  box-shadow: 0px 2px 4px rgba(227, 233, 243, 0.5);
  transform: translate3d(-178px, 28px, 0px) !important;

  ${({ isopen }) =>
    isopen === 'true' &&
    `
    border-top-color: #aed4fb !important;
    border-top-right-radius: 0;
  `}
`;

export default MenuDropdown;
