import styled from 'styled-components';
import { ModalHeader } from 'reactstrap';

const StyledHeader = styled(ModalHeader)`
  padding-left: 30px;
  padding-right: 30px;
  padding-top: 17px;
  padding-bottom: 22px !important;
  border: 0;
  background-color: #fafafa;
  > h5 {
    width: 100%;
    text-align: center;
    font-family: Lato;
    font-weight: bold !important;
    font-size: 1.8rem !important;
    line-height: normal;
  }
  > button {
    display: none;
  }
`;

export default StyledHeader;
