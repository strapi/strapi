import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { TextButton } from '@strapi/design-system/TextButton';
import { Icon } from '@strapi/design-system/Icon';
import { Typography } from '@strapi/design-system/Typography';
import Trash from '@strapi/icons/Trash';
import Drag from '@strapi/icons/Drag';
import DropdownIcon from '@strapi/icons/CarretDown';
import { CustomIconButtonSibling } from './IconButtonCustoms';

const SiblingWrapper = styled.span`
  display: flex;
  justify-content: space-between;
  padding-left: ${({ theme }) => theme.spaces[4]};
  padding-right: ${({ theme }) => theme.spaces[4]};
  background-color: ${({ theme }) => theme.colors.neutral0};
  height: ${50 / 16}rem;
`;

const ToggleButton = styled(TextButton)`
  text-align: left;

  svg {
    width: ${14 / 16}rem;
    height: ${14 / 16}rem;

    path {
      fill: ${({ theme, expanded }) =>
        expanded ? theme.colors.primary600 : theme.colors.neutral500};
    }
  }
`;

const DraggingSibling = ({ displayedValue }) => {
  return (
    <SiblingWrapper>
      <Stack horizontal size={3} flex={1}>
        <Flex
          justifyContent="center"
          borderRadius="50%"
          height={`${24 / 16}rem}`}
          width={`${24 / 16}rem}`}
          aria-hidden
          as="span"
          background="neutral200"
        >
          <Icon as={DropdownIcon} width={`${8 / 16}rem}`} color="neutral600" />
        </Flex>

        <ToggleButton onClick={() => {}} flex={1}>
          <Typography fontWeight="bold" textColor="neutral700">
            {displayedValue}
          </Typography>
        </ToggleButton>
      </Stack>

      <Stack horizontal size={0}>
        <CustomIconButtonSibling noBorder onClick={() => {}} icon={<Trash />} />
        <CustomIconButtonSibling icon={<Drag />} noBorder />
      </Stack>
    </SiblingWrapper>
  );
};

DraggingSibling.propTypes = {
  displayedValue: PropTypes.string.isRequired,
};

export default DraggingSibling;
