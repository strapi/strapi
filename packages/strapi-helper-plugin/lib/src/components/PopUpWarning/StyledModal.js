import styled from 'styled-components';
import { Modal } from 'reactstrap';

const StyledModal = styled(Modal)`
  max-width: 37.5rem !important;
  margin: 16.2rem auto !important;
  > div {
    width: 37.5rem;
    padding: 0 !important;
    border: none;
    border-radius: 2px;
  }
`;
export default StyledModal;
