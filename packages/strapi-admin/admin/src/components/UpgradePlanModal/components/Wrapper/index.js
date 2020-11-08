import styled from 'styled-components';
import Balloon from './balloon.png';

const Wrapper = styled.div`
  height: 390px;
  width: 100%;
  padding-top: 89px;
  padding-left: 65px;
  background-image: url(${Balloon});
  background-size: contain;
  background-position: right;
`;

export default Wrapper;
