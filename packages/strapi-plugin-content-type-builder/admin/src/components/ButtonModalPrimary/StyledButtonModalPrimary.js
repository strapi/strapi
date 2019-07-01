import styled from 'styled-components';
import { Button } from 'reactstrap';

const StyledButtonModalPrimary = styled(Button)`
  height: 3rem;
  min-width: 11rem;
  background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
  padding: 0 15px;
  -webkit-font-smoothing: antialiased;
  cursor: pointer;
  border-radius: 3px;
  color: white;
  border: none;
  font-family: Lato;
  line-height: normal;
  font-size: 13px;
  font-weight: 600;
  outline: 0;
  &:hover,
  &:active {
    border: none;
    background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
    color: white;
  }
  i {
    font-weight: 600;
    font-size: 1.3rem;
    margin-right: 13px;
  }
`;

export default StyledButtonModalPrimary;
