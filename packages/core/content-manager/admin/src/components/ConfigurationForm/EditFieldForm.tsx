import {
  useNotification,
  InputRenderer,
  Form,
  InputProps,
  useField,
} from '@strapi/admin/strapi-admin';
import { Button, Flex, Grid, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { ATTRIBUTE_TYPES_THAT_CANNOT_BE_MAIN_FIELD } from '../../constants/attributes';
import { useGetInitialDataQuery } from '../../services/init';
import { capitalise } from '../../utils/strings';
import { getTranslation } from '../../utils/translations';
import { FieldTypeIcon } from '../FieldTypeIcon';

import { TEMP_FIELD_NAME } from './Fields';

import type { ConfigurationFormData } from './Form';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const FIELD_SCHEMA = yup.object().shape({
  label: yup.string().required().nullable(),
  description: yup.string(),
  editable: yup.boolean(),
  size: yup.number().required(),
});

/* -------------------------------------------------------------------------------------------------
 * EditFieldForm
 * -----------------------------------------------------------------------------------------------*/

interface EditFieldFormProps {
  attribute?: Schema.Attribute.AnyAttribute;
  name: string;
  onClose: () => void;
}

const EditFieldForm = ({ attribute, name, onClose }: EditFieldFormProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();

  const { value, onChange } =
    useField<ConfigurationFormData['layout'][number]['children'][number]>(name);

  const { data: mainFieldOptions } = useGetInitialDataQuery(undefined, {
    selectFromResult: (res) => {
      if (attribute?.type !== 'relation' || !res.data) {
        return { data: [] };
      }

      if ('targetModel' in attribute && typeof attribute.targetModel === 'string') {
        const targetSchema = res.data.contentTypes.find(
          (schema) => schema.uid === attribute.targetModel
        );

        if (targetSchema) {
          return {
            data: Object.entries(targetSchema.attributes).reduce<
              Array<{ label: string; value: string }>
            >((acc, [key, attribute]) => {
              /**
               * Create the list of attributes from the schema as to which can
               * be our `mainField` and dictate the display name of the schema
               * we're editing.
               */
              if (!ATTRIBUTE_TYPES_THAT_CANNOT_BE_MAIN_FIELD.includes(attribute.type)) {
                acc.push({
                  label: key,
                  value: key,
                });
              }

              return acc;
            }, []),
          };
        }
      }

      return { data: [] };
    },
    skip: attribute?.type !== 'relation',
  });

  if (!value || value.name === TEMP_FIELD_NAME || !attribute) {
    // This is very unlikely to happen, but it ensures the form is not opened without a value.
    console.error(
      "You've opened a field to edit without it being part of the form, this is likely a bug with Strapi. Please open an issue."
    );

    toggleNotification({
      message: formatMessage({
        id: 'content-manager.containers.edit-settings.modal-form.error',
        defaultMessage: 'An error occurred while trying to open the form.',
      }),
      type: 'danger',
    });

    return null;
  }

  return (
    <Modal.Content>
      <Form
        method="PUT"
        initialValues={value}
        validationSchema={FIELD_SCHEMA}
        onSubmit={(data) => {
          onChange(name, data);
          onClose();
        }}
      >
        <Modal.Header>
          <Flex gap={3}>
            <FieldTypeIcon type={attribute.type} />
            <Modal.Title>
              {formatMessage(
                {
                  id: 'content-manager.containers.edit-settings.modal-form.label',
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: capitalise(value.name) }
              )}
            </Modal.Title>
          </Flex>
        </Modal.Header>
        <Modal.Body>
          <Grid.Root gap={4}>
            {[
              {
                name: 'label',
                label: formatMessage({
                  id: getTranslation('containers.edit-settings.modal-form.label'),
                  defaultMessage: 'Label',
                }),
                size: 6,
                type: 'string' as const,
              },
              {
                name: 'description',
                label: formatMessage({
                  id: getTranslation('containers.edit-settings.modal-form.description'),
                  defaultMessage: 'Description',
                }),
                size: 6,
                type: 'string' as const,
              },
              {
                name: 'placeholder',
                label: formatMessage({
                  id: getTranslation('containers.edit-settings.modal-form.placeholder'),
                  defaultMessage: 'Placeholder',
                }),
                size: 6,
                type: 'string' as const,
              },
              {
                name: 'editable',
                label: formatMessage({
                  id: getTranslation('containers.edit-settings.modal-form.editable'),
                  defaultMessage: 'Editable',
                }),
                size: 6,
                type: 'boolean' as const,
              },
              {
                name: 'mainField',
                label: formatMessage({
                  id: getTranslation('containers.edit-settings.modal-form.mainField'),
                  defaultMessage: 'Entry title',
                }),
                hint: formatMessage({
                  id: getTranslation(
                    'containers.SettingPage.edit-settings.modal-form.mainField.hint'
                  ),
                  defaultMessage: 'Set the displayed field',
                }),
                size: 6,
                options: mainFieldOptions,
                type: 'enumeration' as const,
              },
              {
                name: 'size',
                label: formatMessage({
                  id: getTranslation('containers.ListSettingsView.modal-form.size'),
                  defaultMessage: 'Size',
                }),
                size: 6,
                options: [
                  { value: '4', label: '33%' },
                  { value: '6', label: '50%' },
                  { value: '8', label: '66%' },
                  { value: '12', label: '100%' },
                ],
                type: 'enumeration' as const,
              },
            ]
              .filter(filterFieldsBasedOnAttributeType(attribute.type))
              .map(({ size, ...field }) => (
                <Grid.Item key={field.name} col={size} direction="column" alignItems="stretch">
                  <InputRenderer {...field} />
                </Grid.Item>
              ))}
          </Grid.Root>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          </Modal.Close>
          <Button type="submit">
            {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal.Content>
  );
};

/**
 * @internal
 * @description not all edit fields have the same editable properties, it depends on the type
 * e.g. a dynamic zone can only change it's label.
 */
const filterFieldsBasedOnAttributeType = (type: Schema.Attribute.Kind) => (field: InputProps) => {
  switch (type) {
    case 'blocks':
    case 'richtext':
      return field.name !== 'size' && field.name !== 'mainField';
    case 'boolean':
    case 'media':
      return field.name !== 'placeholder' && field.name !== 'mainField';
    case 'component':
    case 'dynamiczone':
      return field.name === 'label' || field.name === 'editable';
    case 'json':
      return field.name !== 'placeholder' && field.name !== 'mainField' && field.name !== 'size';
    case 'relation':
      return true;
    default:
      return field.name !== 'mainField';
  }
};

export { EditFieldForm };
export type { EditFieldFormProps };
