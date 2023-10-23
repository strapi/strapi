import React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Cross, Drag, Pencil } from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const ActionBox = styled(Flex)`
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionBox)`
  border-right: 1px solid
    ${({ theme, isSibling }) => (isSibling ? theme.colors.neutral150 : theme.colors.primary200)};

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const FieldContainer = styled(Flex)`
  border: 1px solid
    ${({ theme, isSibling }) => (isSibling ? theme.colors.neutral150 : theme.colors.primary200)};

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme, isSibling }) => (isSibling ? undefined : theme.colors.primary600)};
    }
  }
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: ${72 / 16}rem;
`;

export function CardDragPreview({ labelField, transparent, isSibling }) {
  return (
    <FieldContainer
      background={isSibling ? 'neutral100' : 'primary100'}
      display="inline-flex"
      gap={3}
      hasRadius
      justifyContent="space-between"
      transparent={transparent}
      isSibling={isSibling}
      max-height={pxToRem(32)}
      maxWidth="min-content"
      opacity={transparent ? 0 : 1}
    >
      <Flex gap={3}>
        <DragButton alignItems="center" cursor="all-scroll" padding={3}>
          <Drag />
        </DragButton>

        <TypographyMaxWidth
          textColor={isSibling ? undefined : 'primary600'}
          fontWeight="bold"
          ellipsis
        >
          {labelField}
        </TypographyMaxWidth>
      </Flex>

      <Flex>
        <ActionBox alignItems="center">
          <Pencil />
        </ActionBox>

        <ActionBox alignItems="center">
          <Cross />
        </ActionBox>
      </Flex>
    </FieldContainer>
  );
}

CardDragPreview.defaultProps = {
  isSibling: false,
  transparent: false,
};

CardDragPreview.propTypes = {
  isSibling: PropTypes.bool,
  labelField: PropTypes.string.isRequired,
  transparent: PropTypes.bool,
};
