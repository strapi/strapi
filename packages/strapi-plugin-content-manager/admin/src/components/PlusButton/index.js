import styled from 'styled-components';

const beforeStyle = `
  content: ' ';
  position: absolute;
  display: block;
  width: 14px;
  height: 2px;
  left: 11px;
  top: 17px;
  bottom: 10px;
  z-index: 9;
`;

const afterStyle = `
  content: ' ';
  position: absolute;
  display: block;
  height: 14px;
  width: 2px;
  left: 17px;
  top: 11px;
  right: 10px;
  z-index: 9;
`;

const Button = styled.button`
  position: relative;
  height: 36px;
  width: 36px;
  background-color: #f3f4f4;
  border-radius: 50%;
  text-align: center;

  :focus {
    outline: 0;
  }

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
