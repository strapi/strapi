import styled from 'styled-components';

const Label = styled.label`
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background-color: rgba(28, 93, 231, 0.01);

  > input {
    display: none;
  }
`;

export default Label;
