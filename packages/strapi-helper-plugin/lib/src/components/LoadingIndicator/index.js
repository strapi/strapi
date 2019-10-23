/**
 *
 * LoadingIndicator
 *
 */
import React from 'react';
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
  justify-content: space-around;
  width: 100%;
  > div {
    width: 26px;
    height: 26px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #555555 !important;
    border-radius: 50%;
    animation: ${spin} 2s linear infinite;
  }
`;

const LoadingIndicator = () => (
  <Loader>
    <div />
  </Loader>
);

export default LoadingIndicator;
