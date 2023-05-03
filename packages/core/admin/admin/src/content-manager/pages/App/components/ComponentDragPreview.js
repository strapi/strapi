import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import { Flex, Typography, IconButton } from '@strapi/design-system';
import { Trash, Drag, CarretDown } from '@strapi/icons';

const DropdownIconWrapper = styled(Flex)`
  border-radius: 50%;

  svg {
    height: ${6 / 16}rem;
    width: ${11 / 16}rem;
    > path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

// TODO: we shouldn't have to reset a whole button
const ToggleButton = styled.button`
  border: none;
  background: transparent;
  display: block;
  width: 100%;
  text-align: unset;
  padding: 0;
`;

export function ComponentDragPreview({ displayedValue }) {
  return (
    <Flex
      background="neutral0"
      borderColor="neutral200"
      justifyContent="space-between"
      gap={3}
      padding={3}
      width={pxToRem(300)}
    >
      <ToggleButton type="button">
        <Flex gap={6}>
          <DropdownIconWrapper
            alignItems="center"
            justifyContent="center"
            background="neutral200"
            height={pxToRem(32)}
            width={pxToRem(32)}
          >
            <CarretDown />
          </DropdownIconWrapper>

          <Flex maxWidth={pxToRem(150)}>
            <Typography textColor="neutral700" ellipsis>
              {displayedValue}
            </Typography>
          </Flex>
        </Flex>
      </ToggleButton>

      <Flex gap={2}>
        <IconButton noBorder>
          <Trash />
        </IconButton>

        <IconButton noBorder>
          <Drag />
        </IconButton>
      </Flex>
    </Flex>
  );
}

ComponentDragPreview.propTypes = {
  displayedValue: PropTypes.string.isRequired,
};
