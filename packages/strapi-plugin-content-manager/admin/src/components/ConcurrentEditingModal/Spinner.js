import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.div`
  width: 1rem;
  height: 1rem;
  margin-top: 0.3rem;
  border: 2px solid #f7f5f0;
  border-top: 2px solid #d1cec7;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

export default Spinner;
