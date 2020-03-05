// I am keeping this file if we want to join the scrollbars again
import styled from 'styled-components';

const LeftMenuSection = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;

  &:first-child {
    overflow: hidden;
    max-height: 180px;
    height: auto;
    flex: 0 1 auto;
  }
`;

export default LeftMenuSection;
