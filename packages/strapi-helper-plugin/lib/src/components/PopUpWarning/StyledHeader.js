import styled from 'styled-components';
import { ModalHeader } from 'reactstrap';

const StyledHeader = styled(ModalHeader)`
  margin-left: 30px;
  margin-right: 30px;
  padding-bottom: 11px !important;
  border-bottom: 1px solid #f6f6f6;

  > h5 {
    width: 100%;
    text-align: center;
    font-family: Lato;
    font-weight: bold !important;
    font-size: 1.8rem !important;
  }

  > button {
    color: #c3c5c8;
    opacity: 1;
    font-size: 1.8rem;
    font-weight: 100;
    z-index: 999;
    cursor: pointer;

    > span {
      display: none;
    }

    &:hover,
    &:focus {
      color: #c3c5c8;
      opacity: 1;
      outline: 0 !important;
    }

    &:before {
      content: '\f00d';
      position: absolute;
      top: 14px;
      right: 14px;
      font-family: 'FontAwesome';
      font-weight: 400;
      font-size: 1.2rem;
    }
  }
`;

export default StyledHeader;
