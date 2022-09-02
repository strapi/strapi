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
    width: 100%;
    height: 4px;
    z-index: 1;
  }

  &:before {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: ${({ overflow }) =>
      overflow === 'top-bottom' || overflow === 'top' ? "''" : undefined};
    background: linear-gradient(rgba(33, 33, 52, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
    top: 0;
  }

  &:after {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: ${({ overflow }) =>
      overflow === 'top-bottom' || overflow === 'bottom' ? "''" : undefined};
    background: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(33, 33, 52, 0.1) 100%);
    bottom: 0;
  }
`;

const CustomStack = styled(Stack)`
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  height: ${({ height }) => `${height}px`};
`;

export const RelationList = ({ children, onScroll, listHeight, ...props }) => {
  return (
    <ShadowBox {...props}>
      {/* To fix: breaks spacing when adding as="ol" */}
      <CustomStack spacing={1} height={listHeight} onScroll={onScroll}>
        {children}
      </CustomStack>
    </ShadowBox>
  );
};

RelationList.defaultProps = {
  listHeight: 200,
  onScroll: undefined,
  overflow: undefined,
};

RelationList.propTypes = {
  children: PropTypes.node.isRequired,
  listHeight: PropTypes.number,
  onScroll: PropTypes.func,
  overflow: PropTypes.oneOf(['top-bottom', 'bottom', 'top']),
};
