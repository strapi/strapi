import styled from 'styled-components';
import { Modal } from 'reactstrap';

const StyledModal = styled(Modal)`
  background-color: transparent;
  max-width: 92rem !important;
  margin-left: auto !important;
  margin-right: auto !important;
  margin-top: 12.7rem !important;
  > div {
    padding-left: 0;
    padding-right: 0;
    border: none;
    border-radius: 2px;
    background-color: white;
    overflow: hidden;
  }
`;

export default StyledModal;
