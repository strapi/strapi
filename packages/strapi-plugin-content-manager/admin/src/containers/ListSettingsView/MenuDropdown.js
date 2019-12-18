import styled from 'styled-components';
import { DropdownMenu } from 'reactstrap';

const MenuDropdown = styled(DropdownMenu)`
  max-height: 180px;
  // min-width: calc(100% + 2px);
  min-width: 230px;
  margin-left: -1px;
  margin-top: -1px;
  padding: 0;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0;
  border-color: #e3e9f3 !important;
  border-top-color: #aed4fb !important;
  box-shadow: 0 2px 3px rgba(227, 233, 245, 0.5);
  transform: translate3d(-199px, 30px, 0px) !important;

  overflow: scroll;

  button {
    height: 30px;
    padding-left: 10px !important;
    line-height: 26px;
    cursor: pointer;
    font-size: 13px !important;
    &:focus,
    &:active,
    &:hover,
    &:hover {
      background-color: #fafafb !important;
      color: #333740;
      outline: 0;
    }
    div {
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

export default MenuDropdown;
