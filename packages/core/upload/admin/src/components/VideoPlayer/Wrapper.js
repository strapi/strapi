import styled from 'styled-components';

const Wrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
  video {
    display: block;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    margin: auto;
    outline: 0;
  }
`;

export default Wrapper;
