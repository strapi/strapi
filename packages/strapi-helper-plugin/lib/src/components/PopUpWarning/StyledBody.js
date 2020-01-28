import styled from 'styled-components';
import { ModalBody } from 'reactstrap';

const StyledBody = styled(ModalBody)`
  padding: 0;
  .modalBodyContainerHelper {
    padding: 21px 30px 15px 30px !important;
    color: #f64d0a;
    text-align: center;
    font-family: Lato;
    font-size: 1.3rem;
    > img {
      width: 2.5rem;
      margin-bottom: 2.2rem;
    }
    > p {
      line-height: 1.8rem;
      margin-bottom: 0;
      min-height: 36px;
    }
  }
  .popUpWarningButtonContainer {
    display: flex;
    width: 100%;
    margin-top: 18px;
    justify-content: space-between;
    background-color: #eff3f6;
    padding: 15px 30px 17px 30px;
    > button {
      padding-left: 30px;
      padding-right: 30px;
    }
  }
`;

export default StyledBody;
