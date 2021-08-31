import styled from 'styled-components';
import Bkg from '../../assets/images/background_input.svg';

const Select = styled.select`
  min-height: 3.4rem;
  margin-top: 0.9rem;
  padding-top: 0rem;
  padding-left: 1rem;
  background-position: right -1px center;
  background-repeat: no-repeat;
  background-image: url("${Bkg}");
  border: 1px solid #e3e9f3;
  border-radius: 0.25rem;
  line-height: 3.2rem;
  font-size: 1.3rem;
  font-family: 'Lato' !important;
  -moz-appearance: none;
  -webkit-appearance: none;
  box-shadow: 0px 1px 1px rgba(104, 118, 142, 0.05);

  &:disabled {
    background-color: #fff !important;
    opacity: 0.7 !important;
    cursor: not-allowed;
  }
`;

export default Select;
