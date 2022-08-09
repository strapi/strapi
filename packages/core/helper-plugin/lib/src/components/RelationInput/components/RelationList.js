import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';

const ShadowBox = styled(Box)`
  position: relative;

  &:before,
  &:after {
    position: absolute;
    opacity: 0.8;
    width: 100%;
    height: 4px;
    z-index: 1;
  }

  &:before {
    content: ${({ overflow }) =>
      overflow === 'top-bottom' || overflow === 'top' ? "''" : undefined};
    background: linear-gradient(#dfdfe7 0%, rgba(0, 0, 0, 0) 100%);
    top: 0;
  }

  &:after {
    content: ${({ overflow }) =>
      overflow === 'top-bottom' || overflow === 'bottom' ? "''" : undefined};
    background: linear-gradient(rgba(0, 0, 0, 0) 0%, #dfdfe7 100%);
    bottom: 0;
  }
`;

export const RelationList = ({ children, ...props }) => {
  return (
    <ShadowBox {...props}>
      <Stack spacing={1}>{children}</Stack>
    </ShadowBox>
  );
};

RelationList.defaultProps = {
  overflow: undefined,
};

RelationList.propTypes = {
  children: PropTypes.node.isRequired,
  overflow: PropTypes.oneOf(['top-bottom', 'bottom', 'top']),
};
