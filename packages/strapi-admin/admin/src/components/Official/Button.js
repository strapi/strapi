import styled from 'styled-components';

const Button = styled.button`
  display: flex;
  height: 20px !important;
  width: 88px;
  padding: 0 10px;
  border-radius: 2px;
  background-color: #ee8948;
  line-height: 20px;
  text-align: center;
  text-transform: uppercase;
  > span {
    height: 20px;
    padding: 0 !important;
    color: #fff;
    letter-spacing: 0.5px;
    font-weight: 600;
    font-size: 11px;
  }

  > i,
  > svg {
    margin-top: 1px;
    margin-right: 6px;
    vertical-align: -webkit-baseline-middle;

    color: #ffdc00;
    font-size: 10px;
  }
`;

export default Button;
