import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Loader = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 100%;
  height: 100vh;
  > div {
    margin: auto;
    width: 50px;
    height: 50px;
    border: 6px solid #f3f3f3; /* Light grey */
    border-top: 6px solid #1c91e7; /* Blue */
    border-radius: 50%;
    animation: ${spin} 2s linear infinite;
  }
`;
export default Loader;
