import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';

const ShadowBox = styled(Box)`
  position: relative;

  &:before {
    content: ${({ overflowing }) =>
      overflowing === 'both' || overflowing === 'top' ? "''" : undefined};
    position: absolute;
    background: linear-gradient(#dfdfe7 0%, rgba(0, 0, 0, 0) 100%);
    opacity: 0.8;
    top: 0;
    width: 100%;
    height: 4px;
    z-index: 1;
  }

  &:after {
    content: ${({ overflowing }) =>
      overflowing === 'both' || overflowing === 'bottom' ? "''" : undefined};
    position: absolute;
    background: linear-gradient(rgba(0, 0, 0, 0) 0%, #dfdfe7 100%);
    opacity: 0.8;
    bottom: 0;
    width: 100%;
    height: 4px;
    z-index: 1;
  }
`;

export const ShadowList = ({ overflowing, children, ...props }) => {
  return (
    <ShadowBox overflowing={overflowing} {...props}>
      <Stack spacing={1}>{children}</Stack>
    </ShadowBox>
  );
};

ShadowList.defaultProps = {
  overflowing: undefined,
};

ShadowList.propTypes = {
  children: PropTypes.node.isRequired,
  overflowing: PropTypes.oneOf(['both', 'bottom', 'top']),
};
