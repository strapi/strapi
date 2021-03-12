import styled from 'styled-components';
import { TransitionGroup } from 'react-transition-group';

const Wrapper = styled(TransitionGroup)`
  display: flex;
  align-items: center;
  flex-direction: column;
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  z-index: 1100;
  list-style: none;
  width: 100%;
  overflow-y: hidden;
  pointer-events: none;
`;

export default Wrapper;
