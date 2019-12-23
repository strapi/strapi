import styled from 'styled-components';

const Tooltip = styled.div`
  position: absolute;
  bottom: -10px;
  left: 105px;
  visibility: ${({ isOver }) => (isOver ? 'visible' : 'hidden')};
  line-height: 20px;
  height: 20px;
  padding: 0 10px;
  background-color: #000000;
  font-size: 12px;
  color: #fff;
  opacity: 0.5;
  border: 1px solid #e3e9f3;
  z-index: 99;
`;

export default Tooltip;
