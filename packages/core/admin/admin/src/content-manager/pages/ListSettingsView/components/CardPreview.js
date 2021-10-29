import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';
import { ButtonText } from '@strapi/design-system/Text';
import { Stack } from '@strapi/design-system/Stack';
import Pencil from '@strapi/icons/Pencil';
import Cross from '@strapi/icons/Cross';
import Drag from '@strapi/icons/Drag';
import ellipsisCardTitle from '../utils/ellipsisCardTitle';

const ActionBox = styled(Flex)`
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionBox)`
  padding: 0 ${({ theme }) => theme.spaces[3]};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const FieldContainer = styled(Flex)`
  display: inline-flex;
  max-height: ${32 / 16}rem;
  background-color: ${({ theme }) => theme.colors.primary100};
  border-color: ${({ theme }) => theme.colors.primary200};

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }

  ${ButtonText} {
    color: ${({ theme }) => theme.colors.primary600};
  }

  ${DragButton} {
    border-right: 1px solid ${({ theme }) => theme.colors.primary200};
  }
`;

const CardPreview = ({ labelField }) => {
  const cardEllipsisTitle = ellipsisCardTitle(labelField);

  return (
    <FieldContainer
      borderColor="neutral150"
      background="neutral100"
      hasRadius
      justifyContent="space-between"
    >
      <Stack horizontal size={3}>
        <DragButton alignItems="center">
          <Drag />
        </DragButton>
        <ButtonText>{cardEllipsisTitle}</ButtonText>
      </Stack>
      <Flex paddingLeft={3}>
        <ActionBox alignItems="center">
          <Pencil />
        </ActionBox>
        <ActionBox alignItems="center">
          <Cross />
        </ActionBox>
      </Flex>
    </FieldContainer>
  );
};

CardPreview.propTypes = {
  labelField: PropTypes.string.isRequired,
};

export default CardPreview;
