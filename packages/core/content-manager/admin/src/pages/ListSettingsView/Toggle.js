import styled from 'styled-components';
import { DropdownToggle } from 'reactstrap';

const openedStyle = `
  background-color: #e6f0fb !important;
  border: 1px solid #aed4fb !important;
  color: #007eff !important;
`;

const beforeStyle = `
  content: '\f067';
  font-family: FontAwesome;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
`;

const Toggle = styled(DropdownToggle)`
  width: 30px;
  height: 30px;
  background: #fafafb;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  border-top-right-radius: 2px !important;
  border-bottom-right-radius: 2px !important;
  color: #b3b5b9;

  &:disabled {
    cursor: not-allowed !important;

    background: #fafafb;
    border: 1px solid #e3e9f3;
    border-radius: 2px;
    color: #b3b5b9;
  }

  &:before {
    ${beforeStyle}
  }

  &:hover,
  :active,
  :focus {
    ${openedStyle}

    &:before {
      ${beforeStyle}
    }
  }
`;

export default Toggle;
