import styled from 'styled-components';
import { ModalBody } from 'reactstrap';

const StyledBody = styled(ModalBody)`
  padding: 0;
  text-align: center;
  > div {
    padding: 2.1rem 3rem 1.5rem 3rem !important;
    color: #f64d0a;
    text-align: center;
    font-family: Lato;
    font-size: 1.3rem;
    > img {
      width: 2.5rem;
      margin-bottom: 2.2rem;
    }
    > p {
      width: ${({ small }) => (small ? '200px' : '100%')};
      line-height: 1.8rem;
      margin: auto;
      min-height: 36px;
    }
  }
`;

export default StyledBody;
