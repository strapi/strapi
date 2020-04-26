import styled from 'styled-components';

const RegenerateButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 32px;
  background-color: #fafafb;
  z-index: 10;

  &:hover {
    cursor: pointer;
    background-color: #aed4fb;
  }
`;

export default RegenerateButton;
