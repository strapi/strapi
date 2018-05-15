import styled from 'styled-components';
import Logo from '../../assets/images/icon_filter.png';

const Button = styled.div`
  height: 30px;
  width: 99px;
  text-align: center;
  background-color: #FFFFFF;
  border: 1px solid #E3E9F3;
  border-radius: 2px;
  line-height: 30px;
  font-size: 13px;
  font-weight: 500;
  font-family: Lato;
  -webkit-font-smoothing-antialiased;
  cursor: pointer;
  &:hover {
    background: #F7F8F8;
  }
  &:before {
    content: url(${Logo});
  }
`;

export default Button;
