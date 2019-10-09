import styled from 'styled-components';
import { ModalHeader } from 'reactstrap';

const HeaderModal = styled(ModalHeader)`
  width: auto;
  position: absolute;
  top: 0;
  right: 0;
  z-index: 999;
  border: 0;
  padding: 0;
  > button {
    color: #c3c5c8;
    opacity: 1;
    font-size: 1.2rem;
    font-weight: 100;
    margin: 0;
    padding: 20px;
    &:hover,
    &:focus {
      color: #c3c5c8;
      opacity: 1;
      outline: 0 !important;
      cursor: pointer;
    }
    > span {
      display: none;
    }
    &:before {
      -webkit-font-smoothing: antialiased;
      content: '\f00d';
      font-family: 'FontAwesome';
      font-weight: 400;
      font-size: 1.2rem;
    }

`;
export default HeaderModal;
