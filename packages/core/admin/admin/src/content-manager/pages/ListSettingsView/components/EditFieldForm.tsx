import * as React from 'react';

import {
  Button,
  Flex,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  TextInput,
  ToggleInput,
  Typography,
} from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { FieldTypeIcon } from '../../../components/FieldTypeIcon';
import { getTranslation } from '../../../utils/translations';

import type { Attribute } from '@strapi/types';

const HeaderContainer = styled(Flex)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

interface EditFieldFormProps {
  attributes: Record<string, Attribute.Any>;
  fieldForm: {
    label?: string;
    sortable?: boolean;
  };
  fieldToEdit: string;
  onChangeEditLabel: (e: {
    target: {
      name: string;
      value: string | boolean;
    };
  }) => void;
  onCloseModal: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  type: React.ComponentProps<typeof FieldTypeIcon>['type'];
}

export const EditFieldForm = ({
  attributes,
  fieldForm,
  fieldToEdit,
  onCloseModal,
  onChangeEditLabel,
  onSubmit,
  type,
}: EditFieldFormProps) => {
  const { formatMessage } = useIntl();

  const attribute = attributes[fieldToEdit];

  let shouldDisplaySortToggle = !['media', 'relation'].includes(type);

  if ('relation' in attribute && ['oneWay', 'oneToOne', 'manyToOne'].includes(attribute.relation)) {
    shouldDisplaySortToggle = true;
  }

  return (
    <ModalLayout onClose={onCloseModal} labelledBy="title">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <HeaderContainer>
            <FieldTypeIcon type={type} />
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              {formatMessage(
                {
                  id: getTranslation('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: upperFirst(fieldToEdit) }
              )}
            </Typography>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            <GridItem s={12} col={6}>
              <TextInput
                id="label-input"
                label={formatMessage({
                  id: getTranslation('form.Input.label'),
                  defaultMessage: 'Label',
                })}
                name="label"
                onChange={(e) => onChangeEditLabel(e)}
                value={fieldForm.label}
                hint={formatMessage({
                  id: getTranslation('form.Input.label.inputDescription'),
                  defaultMessage: "This value overrides the label displayed in the table's head",
                })}
              />
            </GridItem>
            {shouldDisplaySortToggle && (
              <GridItem s={12} col={6}>
                <ToggleInput
                  data-testid="Enable sort on this field"
                  checked={fieldForm.sortable}
                  label={formatMessage({
                    id: getTranslation('form.Input.sort.field'),
                    defaultMessage: 'Enable sort on this field',
                  })}
                  name="sortable"
                  onChange={(e) =>
                    onChangeEditLabel({ target: { name: 'sortable', value: e.target.checked } })
                  }
                  onLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.on-label',
                    defaultMessage: 'on',
                  })}
                  offLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.off-label',
                    defaultMessage: 'off',
                  })}
                />
              </GridItem>
            )}
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onCloseModal} variant="tertiary">
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
