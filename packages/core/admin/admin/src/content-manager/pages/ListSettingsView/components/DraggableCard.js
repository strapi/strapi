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
import { getTrad } from '../../../utils';

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

const DraggableCard = ({ name, labelField, onRemoveField, onClickEditField }) => {
  const { formatMessage } = useIntl();
  const editButtonRef = useRef();
  const cardEllipsisTitle =
    labelField.length > 20 ? `${labelField.substring(0, 20)}...` : labelField;

  const handleClickEditRow = () => {
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
        onClick={handleClickEditRow}
      >
        <Stack horizontal size={3}>
          <DragButton
            aria-label={formatMessage(
              {
                id: getTrad('components.DraggableCard.move.field'),
                defaultMessage: 'Move {item}',
              },
              { item: name }
            )}
            type="button"
          >
            <Drag />
          </DragButton>
          <ButtonText>{cardEllipsisTitle}</ButtonText>
        </Stack>
        <Row paddingLeft={3}>
          <ActionButton
            ref={editButtonRef}
            onClick={e => {
              e.stopPropagation();
              onClickEditField(name);
            }}
            aria-label={formatMessage(
              {
                id: getTrad('components.DraggableCard.edit.field'),
                defaultMessage: 'Edit {item}',
              },
              { item: name }
            )}
            type="button"
          >
            <EditIcon />
          </ActionButton>
          <ActionButton
            onClick={onRemoveField}
            data-testid={`delete-${name}`}
            aria-label={formatMessage(
              {
                id: getTrad('components.DraggableCard.delete.field'),
                defaultMessage: 'Delete {item}',
              },
              { item: name }
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

DraggableCard.propTypes = {
  labelField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onClickEditField: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func.isRequired,
};

export default DraggableCard;
