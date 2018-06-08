import styled from 'styled-components';

const CustomButton = styled.button`
  height: 30px;
  margin-right: 10px; 
  padding: 0 10px;
  text-align: center;
  background-color: #FFFFFF;
  border: 1px solid #E3E9F3;
  border-radius: 2px;
  line-height: 28px;
  font-size: 13px;
  font-weight: 500;
  font-family: Lato;
  -webkit-font-smoothing-antialiased;
  cursor: pointer;
  &:hover {
    background: #F7F8F8;
  }
`;

export default CustomButton;
