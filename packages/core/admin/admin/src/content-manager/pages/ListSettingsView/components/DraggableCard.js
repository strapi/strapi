import React, { useRef } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Row } from '@strapi/parts/Row';
import { Box } from '@strapi/parts/Box';
import { ButtonText } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import EditIcon from '@strapi/icons/EditIcon';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import Drag from '@strapi/icons/Drag';

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionButton)`
  padding: 0 ${({ theme }) => theme.spaces[3]};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const FieldContainer = styled(Row)`
  min-width: ${200 / 16}rem;
  max-height: ${32 / 16}rem;
  cursor: pointer;

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary200};

    svg {
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
  }
`;

const FieldWrapper = styled(Box)`
  &:last-child {
    padding-right: ${({ theme }) => theme.spaces[3]};
  }
`;

const DraggableCard = ({ title, onRemoveField }) => {
  const { formatMessage } = useIntl();
  const editButtonRef = useRef();
  const cardTitle = title.length > 12 ? `${title.substring(0, 12)}...` : title;

  const rowHandleClick = () => {
    if (editButtonRef.current) {
      editButtonRef.current.click();
    }
  };

  return (
    <FieldWrapper>
      <FieldContainer
        borderColor="neutral150"
        background="neutral100"
        hasRadius
        justifyContent="space-between"
        onClick={rowHandleClick}
      >
        <Stack horizontal size={3}>
          <DragButton
            aria-label={formatMessage(
              {
                id: 'content-manager.components.DraggableCard.move.field',
                defaultMessage: 'Move {item}',
              },
              { item: title }
            )}
            type="button"
          >
            <Drag />
          </DragButton>
          <ButtonText>{cardTitle}</ButtonText>
        </Stack>
        <Row>
          <ActionButton
            ref={editButtonRef}
            onClick={e => {
              e.stopPropagation();
              console.log('edit');
            }}
            aria-label={formatMessage(
              {
                id: 'content-manager.components.DraggableCard.edit.field',
                defaultMessage: 'Edit {item}',
              },
              { item: title }
            )}
            type="button"
          >
            <EditIcon />
          </ActionButton>
          <ActionButton
            onClick={onRemoveField}
            data-testid={`delete-${title}`}
            aria-label={formatMessage(
              {
                id: 'content-manager.components.DraggableCard.delete.field',
                defaultMessage: 'Delete {item}',
              },
              { item: title }
            )}
            type="button"
          >
            <CloseAlertIcon />
          </ActionButton>
        </Row>
      </FieldContainer>
    </FieldWrapper>
  );
};

DraggableCard.defaultProps = {
  onRemoveField: () => {},
};

DraggableCard.propTypes = {
  onRemoveField: PropTypes.func,
  title: PropTypes.string.isRequired,
};

export default DraggableCard;
