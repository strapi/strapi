import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Row } from '@strapi/parts/Row';
// import { Box } from '@strapi/parts/Box';
import { ButtonText } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import EditIcon from '@strapi/icons/EditIcon';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import Drag from '@strapi/icons/Drag';

const ActionBox = styled(Row)`
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

const FieldContainer = styled(Row)`
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
        <ButtonText>{labelField}</ButtonText>
      </Stack>
      <Row paddingLeft={3}>
        <ActionBox alignItems="center">
          <EditIcon />
        </ActionBox>
        <ActionBox alignItems="center">
          <CloseAlertIcon />
        </ActionBox>
      </Row>
    </FieldContainer>
  );
};

CardPreview.propTypes = {
  labelField: PropTypes.string.isRequired,
};

export default CardPreview;
