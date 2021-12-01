import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
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
  opacity: ${({ transparent }) => (transparent ? 0 : 1)};
  background-color: ${({ theme, isSibling }) =>
    isSibling ? theme.colors.neutral100 : theme.colors.primary100};
  border: 1px solid
    ${({ theme, isSibling }) => (isSibling ? theme.colors.neutral150 : theme.colors.primary200)};

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme, isSibling }) => (isSibling ? undefined : theme.colors.primary600)};
    }
  }

  ${Typography} {
    color: ${({ theme, isSibling }) => (isSibling ? undefined : theme.colors.primary600)};
  }

  ${DragButton} {
    border-right: 1px solid
      ${({ theme, isSibling }) => (isSibling ? theme.colors.neutral150 : theme.colors.primary200)};
  }
`;

const CardPreview = ({ labelField, transparent, isSibling }) => {
  const cardEllipsisTitle = ellipsisCardTitle(labelField);

  return (
    <FieldContainer
      hasRadius
      justifyContent="space-between"
      transparent={transparent}
      isSibling={isSibling}
    >
      <Stack horizontal size={3}>
        <DragButton alignItems="center">
          <Drag />
        </DragButton>
        <Typography fontWeight="bold">{cardEllipsisTitle}</Typography>
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

CardPreview.defaultProps = {
  isSibling: false,
  transparent: false,
};

CardPreview.propTypes = {
  isSibling: PropTypes.bool,
  labelField: PropTypes.string.isRequired,
  transparent: PropTypes.bool,
};

export default CardPreview;
