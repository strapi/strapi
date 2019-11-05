import styled from 'styled-components';

const beforeStyle = `
  content: ' ';
  position: absolute;
  display: block;
  width: 2px;
  left: 17px;
  top: 10px;
  bottom: 10px;
  z-index: 9;
`;

const afterStyle = `
  content: ' ';
  position: absolute;
  display: block;
  height: 2px;
  top: 17px;
  left: 10px;
  right: 10px;
  z-index: 9;
`;

const Button = styled.button`
  height: 36px;
  width: 36px;
  background-color: #f3f4f4;
  border-radius: 50%;

  text-align: center;
  position: relative;

  :before {
    ${beforeStyle}
  }
  :after {
    ${afterStyle}
  }

  :before,
  :after {
    background-color: #b4b6ba;
  }
`;

export default Button;
