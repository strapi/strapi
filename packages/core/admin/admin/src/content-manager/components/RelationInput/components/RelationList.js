import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';

const ShadowBox = styled(Box)`
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;

  &:before,
  &:after {
    position: absolute;
    width: 100%;
    height: 4px;
    z-index: 1;
  }

  &:before {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: ${({ overflowDirection }) =>
      overflowDirection === 'top-bottom' || overflowDirection === 'top' ? "''" : undefined};
    background: linear-gradient(rgba(33, 33, 52, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
    top: 0;
  }

  &:after {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: ${({ overflowDirection }) =>
      overflowDirection === 'top-bottom' || overflowDirection === 'bottom' ? "''" : undefined};
    background: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(33, 33, 52, 0.1) 100%);
    bottom: 0;
  }
`;

export const RelationList = ({ children, overflow, ...props }) => {
  return (
    <ShadowBox overflowDirection={overflow} {...props}>
      {children}
    </ShadowBox>
  );
};

RelationList.defaultProps = {
  overflow: '',
};

RelationList.propTypes = {
  children: PropTypes.node.isRequired,
  overflow: PropTypes.oneOf(['top-bottom', 'bottom', 'top', '']),
};
