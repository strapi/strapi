import styled from 'styled-components';

const Wrapper = styled.button`
  display: flex;
  height: 32px;
  margin-right: 10px;
  padding: 0 10px;
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
  &:focus, &:active {
    outline:0;
  }
  > span {
    margin-left: 10px;
  }
  > svg {
    margin: auto;
    > g  {
      stroke: #282b2c;
    }
  }
`;

export default Wrapper;
