import styled, { keyframes } from 'styled-components';

const loading = keyframes`
from {
  left: -100px;
    width: 30%;
}
50% {
  width: 30%;
}
70% {
  width: 70%;
}
80% {
  left: 50%;
}
95% {
  left: 120%;
}
to {
  left: 100%;
}
`;

const LoadingIndicator = styled.div`
  position: relative;
  width: 44%;
  height: 4px;
  overflow: hidden;
  background-color: #515764;
  border-radius: 2px;
  &:before {
    content: '';
    display: block;
    position: absolute;
    left: -100px;
    width: 100px;
    height: 4px;
    background-color: #b3b5b9;
    animation: ${loading} 2s linear infinite;
  }
`;

export default LoadingIndicator;
