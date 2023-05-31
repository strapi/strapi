import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system';

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
    content: '';
    background: linear-gradient(rgba(3, 3, 5, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
    top: 0;
    opacity: ${({ overflowDirection }) =>
      overflowDirection === 'top-bottom' || overflowDirection === 'top' ? 1 : 0};
    transition: opacity 0.2s ease-in-out;
  }

  &:after {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: '';
    background: linear-gradient(0deg, rgba(3, 3, 5, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
    bottom: 0;
    opacity: ${({ overflowDirection }) =>
      overflowDirection === 'top-bottom' || overflowDirection === 'bottom' ? 1 : 0};
    transition: opacity 0.2s ease-in-out;
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
