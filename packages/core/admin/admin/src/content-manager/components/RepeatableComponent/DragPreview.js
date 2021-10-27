import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Text } from '@strapi/design-system/Text';
import { IconButton } from '@strapi/design-system/IconButton';
import Trash from '@strapi/icons/Trash';
import DragHandle from '@strapi/icons/Drag';
import CarretDown from '@strapi/icons/CarretDown';

const DropdownIconWrapper = styled(Box)`
  height: ${32 / 16}rem;
  width: ${32 / 16}rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    height: ${6 / 16}rem;
    width: ${11 / 16}rem;
    > path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

const ToggleButton = styled.button`
  border: none;
  background: transparent;
  display: block;
  width: 100%;
  text-align: unset;
  padding: 0;
`;

const DragPreview = ({ displayedValue }) => {
  return (
    <Box
      paddingLeft={3}
      paddingRight={3}
      paddingTop={3}
      paddingBottom={3}
      hasRadius
      background="neutral0"
      style={{ width: '20vw' }}
    >
      <Flex justifyContent="space-between">
        <ToggleButton type="button">
          <Flex>
            <DropdownIconWrapper background="neutral200">
              <CarretDown />
            </DropdownIconWrapper>
            <Box paddingLeft={6}>
              <Text textColor="neutral700" style={{ width: '9vw' }} ellipsis>
                {displayedValue}
              </Text>
            </Box>
          </Flex>
        </ToggleButton>
        <Box paddingLeft={3}>
          <Flex>
            <IconButton icon={<Trash />} />
            <Box paddingLeft={2}>
              <IconButton icon={<DragHandle />} />
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

DragPreview.propTypes = {
  displayedValue: PropTypes.string.isRequired,
};

export default DragPreview;
