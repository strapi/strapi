import styled from 'styled-components';
import { Button } from 'reactstrap';

const StyledButtonSecondary = styled(Button)`
  position: relative;
  height: 3rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  cursor: pointer;
  font-family: Lato;
  color: #f64d0a;
  border: 0.1rem solid #f64d0a;
  border-radius: 3px;
  background-color: transparent;
  &:hover,
  &:active {
    color: #f64d0a;
    background-color: white;
    border: 0.1rem solid #f64d0a;
  }
`;

export default StyledButtonSecondary;
