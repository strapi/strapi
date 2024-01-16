import * as React from 'react';

import {
  Button,
  Flex,
  Grid,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { FieldTypeIcon } from '../../../components/FieldTypeIcon';
import { getTranslation } from '../../../utils/translations';
import { useLayoutDnd } from '../hooks/useLayoutDnd';

import { ModalForm } from './ModalForm';

import type { Attribute } from '@strapi/types';

const HeaderContainer = styled(Flex)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

interface FormModalProps {
  onToggle: () => void;
  onMetaChange: (e: { target: { name: string; value: string | boolean | number } }) => void;
  onSizeChange: (e: { name: string; value: number }) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  type: Attribute.Kind;
  customFieldUid?: string;
}

const FormModal = ({
  onToggle,
  onMetaChange,
  onSizeChange,
  onSubmit,
  type,
  customFieldUid,
}: FormModalProps) => {
  const { selectedField } = useLayoutDnd();
  const { formatMessage } = useIntl();

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <HeaderContainer>
            <FieldTypeIcon type={type} customFieldUid={customFieldUid} />
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              {formatMessage(
                {
                  id: getTranslation('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: upperFirst(selectedField) }
              )}
            </Typography>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            <ModalForm onMetaChange={onMetaChange} onSizeChange={onSizeChange} />
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onToggle} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={
            <Button type="submit">
              {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
            </Button>
          }
        />
      </form>
    </ModalLayout>
  );
};
export { FormModal };
