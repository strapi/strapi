import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import { Box, Flex, Typography, IconButton } from '@strapi/design-system';
import { Trash, Drag, CarretDown } from '@strapi/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const DragPreviewBox = styled(Box)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

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

const Icon = styled(FontAwesomeIcon)`
  width: 14px;
  height: 14px;

  color: ${({ theme }) => theme.colors.neutral600};
`;

const ToggleButton = styled.button`
  border: none;
  background: transparent;
  display: block;
  width: 100%;
  text-align: unset;
  padding: 0;
`;

const DragPreview = ({ displayedValue, icon }) => {
  return (
    <DragPreviewBox
      paddingLeft={3}
      paddingRight={3}
      paddingTop={3}
      paddingBottom={3}
      hasRadius
      background="neutral0"
      width={pxToRem(300)}
    >
      <Flex justifyContent="space-between">
        <ToggleButton type="button">
          <Flex>
            <DropdownIconWrapper background="neutral200">
              <CarretDown />
            </DropdownIconWrapper>
            <Flex gap={2} paddingLeft={icon ? 3 : 6} maxWidth={pxToRem(150)}>
              {icon ? <Icon icon={icon} /> : null}
              <Typography textColor="neutral700" ellipsis>
                {displayedValue}
              </Typography>
            </Flex>
          </Flex>
        </ToggleButton>
        <Box paddingLeft={3}>
          <Flex>
            <IconButton noBorder>
              <Trash />
            </IconButton>
            <Box paddingLeft={2}>
              <IconButton noBorder>
                <Drag />
              </IconButton>
            </Box>
          </Flex>
        </Box>
      </Flex>
    </DragPreviewBox>
  );
};

DragPreview.defaultProps = {
  icon: undefined,
};

DragPreview.propTypes = {
  displayedValue: PropTypes.string.isRequired,
  icon: PropTypes.string,
};

export default DragPreview;
