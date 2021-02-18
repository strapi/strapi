import styled from 'styled-components';
import logo from './arrow.png';

const Img = styled.img`
  position: absolute;
  top: 130px;
  right: 195px;
  height: 82px;
`;

Img.defaultProps = {
  alt: 'arrow',
  src: logo,
};

export default Img;
