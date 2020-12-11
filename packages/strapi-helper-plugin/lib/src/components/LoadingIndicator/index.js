/**
 *
 * LoadingIndicator
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
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
    ${({ size }) => {
      switch (size) {
        case 'small': {
          return `
            border-top: 3px solid #555555 !important;
            border: 3px solid #f3f3f3;
            width: 11px;
            height: 11px;
          `;
        }
        case 'medium': {
          return `
            border-top: 3px solid #555555 !important;
            border: 3px solid #f3f3f3;
            width: 20px;
            height: 20px;
          `;
        }
        default: {
          return `
            border-top: 4px solid #555555 !important;
            border: 4px solid #f3f3f3;
            width: 26px;
            height: 26px;
          `;
        }
      }
    }}
    border-radius: 50%;
    animation: ${spin} 2s linear infinite;
  }
`;

const LoadingIndicator = ({ size }) => (
  <Loader size={size}>
    <div />
  </Loader>
);

LoadingIndicator.propTypes = {
  size: PropTypes.string,
};

LoadingIndicator.defaultProps = {
  size: 'standard',
};

export default LoadingIndicator;
