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
    padding: 2rem;
    color: #c3c5c8;
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
      display: none;
    }
  }
  & + svg {
    position: absolute;
    top: 26px;
    right: 30px;
    fill: #c3c5c8;
  }
`;
export default HeaderModal;
