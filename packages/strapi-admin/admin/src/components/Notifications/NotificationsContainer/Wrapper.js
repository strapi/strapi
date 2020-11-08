import styled from 'styled-components';
import { TransitionGroup } from 'react-transition-group';

const Wrapper = styled(TransitionGroup)`
  position: fixed;
  top: 72px;
  left: 240px;
  right: 0;
  z-index: 1100;
  list-style: none;
  width: 300px;
  margin: 0 auto;
  overflow-y: hidden;
`;

export default Wrapper;
