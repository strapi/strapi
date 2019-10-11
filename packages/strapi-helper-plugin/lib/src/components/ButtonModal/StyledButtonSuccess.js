import styled from 'styled-components';
import { Button } from 'reactstrap';

import img from '../../assets/icons/icon_check.png';
import colors from '../../assets/styles/colors';

const StyledButtonModalSuccess = styled(Button)`
  position: relative;
  height: 3rem;
  font-family: Lato;
  color: ${colors.green};
  border: 0.1rem solid ${colors.green};
  border-radius: 3px;
  cursor: pointer;
  background-color: transparent;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  line-height: 1.15;
  &::before,
  span {
    display: inline-block;
    vertical-align: middle;
  }
  &::before {
    margin-right: 1rem;
    content: '';
    background-image: url(${img});
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    width: 9px;
    height: 7px;
  }
  &:hover,
  &:active,
  &.btn-secondary:not(:disabled):not(.disabled):active,
  &.btn-secondary:not(:disabled):not(.disabled):focus,
  &.btn-secondary:not(:disabled):not(.disabled):focus:active,
  &.btn-secondary:hover {
    color: ${colors.green} !important;
    background-color: white;
    border: 0.1rem solid ${colors.green};
  }
`;

export default StyledButtonModalSuccess;
