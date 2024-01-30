import { useId } from 'react';

import {
  Button,
  Flex,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { capitalise } from '../../../../utils/strings';
import { FieldTypeIcon } from '../../../components/FieldTypeIcon';
import { Form, useField } from '../../../components/Form';
import { InputRenderer } from '../../../components/FormInputs/Renderer';
import { getTranslation } from '../../../utils/translations';

import type { ListFieldLayout } from '../../../hooks/useDocumentLayout';
import type { FormData } from '../ListConfigurationPage';

interface EditFieldFormProps extends Pick<ListFieldLayout, 'attribute'> {
  name: string;
  onClose: () => void;
}

const EditFieldForm = ({ attribute, name, onClose }: EditFieldFormProps) => {
  const { formatMessage } = useIntl();
  const id = useId();

  const { value, onChange } = useField<FormData['layout'][number]>(name);

  if (!value) {
    // This is very unlikely to happen, but it ensures the form is not opened without a value.
    throw new Error(
      "You've opened a field to edit without it being part of the form, this is likely a bug with Strapi. Please open an issue."
    );
  }

  let shouldDisplaySortToggle = !['media', 'relation'].includes(attribute.type);

  if ('relation' in attribute && ['oneWay', 'oneToOne', 'manyToOne'].includes(attribute.relation)) {
    shouldDisplaySortToggle = true;
  }

  return (
    <ModalLayout onClose={onClose} labelledBy={id}>
      <Form
        method="PUT"
        initialValues={value}
        onSubmit={(data) => {
          onChange(name, data);
          onClose();
        }}
      >
        <ModalHeader>
          <HeaderContainer>
            {/* @ts-expect-error attribute.type === custom does not work here */}
            <FieldTypeIcon type={attribute.type} />
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id={id}>
              {formatMessage(
                {
                  id: getTranslation('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: capitalise(value.label) }
              )}
            </Typography>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            {[
              {
                name: 'label',
                label: formatMessage({
                  id: getTranslation('form.Input.label'),
                  defaultMessage: 'Label',
                }),
                hint: formatMessage({
                  id: getTranslation('form.Input.label.inputDescription'),
                  defaultMessage: "This value overrides the label displayed in the table's head",
                }),
                size: 6,
                type: 'string' as const,
              },
              {
                label: formatMessage({
                  id: getTranslation('form.Input.sort.field'),
                  defaultMessage: 'Enable sort on this field',
                }),
                name: 'sortable',
                size: 6,
                type: 'boolean' as const,
              },
            ]
              .filter(
                (field) =>
                  field.name !== 'sortable' ||
                  (field.name === 'sortable' && shouldDisplaySortToggle)
              )
              .map(({ size, ...field }) => (
                <GridItem key={field.name} s={12} col={size}>
                  <InputRenderer {...field} />
                </GridItem>
              ))}
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onClose} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={
            <Button type="submit">
              {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
            </Button>
          }
        />
      </Form>
    </ModalLayout>
  );
};

const HeaderContainer = styled(Flex)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

export { EditFieldForm };
export type { EditFieldFormProps };
