import styled from 'styled-components';

const RegenerateButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background-color: #fafafb;
  width: 40px;
  height: 32px;
  &:hover {
    cursor: pointer;
    background-color: #aed4fb;
  }
`;

export default RegenerateButton;
