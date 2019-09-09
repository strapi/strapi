import styled from 'styled-components';
import { Button } from 'reactstrap';

const StyledButtonModalSecondary = styled(Button)`
  font-family: Lato;
  color: #f64d0a;
  border: 0.1rem solid #f64d0a;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  cursor: pointer;
  background-color: transparent;
  &:hover,
  &:active {
    color: #f64d0a;
    background-color: white;
    border: 0.1rem solid #f64d0a;
  }
  height: 3rem;
  color: #f64d0a;
  border: 0.1rem solid #f64d0a;
  position: relative;
  border-radius: 3px;
`;

export default StyledButtonModalSecondary;
