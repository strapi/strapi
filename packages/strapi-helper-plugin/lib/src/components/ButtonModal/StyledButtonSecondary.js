import styled from 'styled-components';
import { Button } from 'reactstrap';

const StyledButtonSecondary = styled(Button)`
  position: relative;
  height: 3rem;
  font-family: Lato;
  border-radius: 3px;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  cursor: pointer;
  font-family: Lato;
  color: #f64d0a;
  border: 0.1rem solid #f64d0a;
  border-radius: 3px;
  background-color: transparent;
  border: 0.1rem solid #f64d0a;
  color: #f64d0a;

  &:hover,
  &:active,
  &.btn-secondary:not(:disabled):not(.disabled):active,
  &.btn-secondary:not(:disabled):not(.disabled):focus,
  &.btn-secondary:not(:disabled):not(.disabled):focus:active,
  &.btn-secondary:hover {
    color: #f64d0a !important;
    background-color: white;
    border: 0.1rem solid #f64d0a;
  }
`;

export default StyledButtonSecondary;
