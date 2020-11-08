import React from 'react';
import styled from 'styled-components';
import { Modal } from 'reactstrap';

const StyledModal = styled(Modal)`
  width: 41.6rem !important;
  margin: 14.4rem auto !important;
  -webkit-font-smoothing: antialiased !important;
  > div {
    width: 41.6rem;
    padding: 0 !important;
    border: none;
    border-radius: 2px;
  }
`;
export default StyledModal;
