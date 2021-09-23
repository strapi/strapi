import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { IconButton } from '@strapi/parts/IconButton';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DragHandle from '@strapi/icons/Drag';
import DropdownIcon from '@strapi/icons/FilterDropdown';

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
      fill: ${({ theme }) => theme.colors.primary600};
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
      background="primary100"
      style={{ width: '20vw' }}
    >
      <Row justifyContent="space-between">
        <ToggleButton type="button">
          <Row>
            <DropdownIconWrapper background="primary200">
              <DropdownIcon />
            </DropdownIconWrapper>
            <Box paddingLeft={6}>
              <Text textColor="primary700" style={{ width: '9vw' }} ellipsis>
                {displayedValue}
              </Text>
            </Box>
          </Row>
        </ToggleButton>
        <Box paddingLeft={3}>
          <Row>
            <IconButton icon={<DeleteIcon />} />
            <Box paddingLeft={2}>
              <IconButton icon={<DragHandle />} />
            </Box>
          </Row>
        </Box>
      </Row>
    </Box>
  );
};

DragPreview.propTypes = {
  displayedValue: PropTypes.string.isRequired,
};

export default DragPreview;
