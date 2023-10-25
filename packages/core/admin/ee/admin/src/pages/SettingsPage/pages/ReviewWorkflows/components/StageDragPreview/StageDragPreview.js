import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { CarretDown } from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Toggle = styled(Flex)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

export function StageDragPreview({ name }) {
  return (
    <Flex
      background="primary100"
      borderStyle="dashed"
      borderColor="primary600"
      borderWidth="1px"
      gap={3}
      hasRadius
      padding={3}
      shadow="tableShadow"
      width={pxToRem(300)}
    >
      <Toggle
        alignItems="center"
        background="neutral200"
        borderRadius="50%"
        height={6}
        justifyContent="center"
        width={6}
      >
        <CarretDown width={`${8 / 16}rem`} />
      </Toggle>

      <Typography fontWeight="bold">{name}</Typography>
    </Flex>
  );
}

StageDragPreview.propTypes = {
  name: PropTypes.string.isRequired,
};
