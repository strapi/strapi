import styled from 'styled-components';
import { ModalHeader } from 'reactstrap';

const HeaderModal = styled(ModalHeader)`
  position: absolute;
  top: 0;
  right: 17px;
  width: auto;
  padding: 0;
  z-index: 999;
  border: 0;
  > button {
    margin: 0;
    margin-top: 12px !important;

    padding: 20px;
    opacity: 1;
    font-size: 1.2rem;
    font-weight: 100;
    position: relative;
    transform: rotate(45deg);
    &:hover,
    &:focus {
      opacity: 1 !important;
      outline: 0 !important;
      cursor: pointer;
    }
    > span {
      z-index: -1;
      &:before {
        content: ' ';
        position: absolute;
        display: block;
        width: 2px;
        left: 13px;
        top: 13px;
        bottom: 9px;
        z-index: 9;
      }
      &:after {
        content: ' ';
        position: absolute;
        display: block;
        height: 2px;
        top: 17px;
        left: 9px;
        right: 8px;
        z-index: 9;
      }
      :before,
      :after {
        background-color: #9ea7b8;
      }
    }
  }
`;
export default HeaderModal;
