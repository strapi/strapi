import { Grid } from '@strapi/design-system';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

import { formFields } from '../core/apis/extensions';

import { FormProvider, useForm } from './Form';
import { InputRenderer } from './FormInputs/Renderer';

import type { PluginValues } from '../../../shared/contracts/shared';
import type { ExtensibleForm, FormFieldsExtension } from '../core/apis/extensions';

interface PluginFormFieldsProps {
  form: ExtensibleForm;
  /** The entity that the form edits, if any */
  entity?: unknown;
  disabled?: boolean;
}

/**
 * The fields plugins add to a core form, as `Grid.Item`s inside a `Form`. Their values are under
 * `plugins.<pluginId>.<name>`
 */
const PluginFormFields = ({ form, entity, disabled = false }: PluginFormFieldsProps) => (
  <>
    {formFields[form].map((extension) => (
      <PluginFields
        key={extension.pluginId}
        extension={extension}
        entity={entity}
        disabled={disabled}
      />
    ))}
  </>
);

interface PluginFieldsProps extends Pick<PluginFormFieldsProps, 'entity'> {
  extension: FormFieldsExtension;
  disabled: boolean;
}

const NO_VALUES = {};

const PluginFields = ({
  extension: { pluginId, useFields },
  entity,
  disabled,
}: PluginFieldsProps) => {
  const { formatMessage } = useIntl();
  const values = useForm(
    'PluginFields',
    // The form values have no type here. The plugin values are under `plugins`
    (state) => (state.values as { plugins?: PluginValues }).plugins?.[pluginId] ?? NO_VALUES
  );
  const fields = useFields({ entity, values });

  return (
    <>
      {fields.map(({ size, ...field }) => (
        <Grid.Item key={field.name} m={size} xs={12} direction="column" alignItems="stretch">
          <InputRenderer
            {...field}
            name={`plugins.${pluginId}.${field.name}`}
            disabled={disabled || field.disabled}
            label={formatMessage(field.label)}
            hint={field.hint ? formatMessage(field.hint) : undefined}
            placeholder={field.placeholder ? formatMessage(field.placeholder) : undefined}
          />
        </Grid.Item>
      ))}
    </>
  );
};

const noop = () => {};

/**
 * {@link PluginFormFields} inside a Formik form
 */
const FormikPluginFormFields = (props: PluginFormFieldsProps) => {
  const { values, isSubmitting, setFieldValue } = useFormikContext<{ plugins?: PluginValues }>();
  const pluginValues = { plugins: values.plugins ?? {} };

  return (
    // Bridges the admin's input renderer to Formik. Rows, resets and validation stay with Formik
    <FormProvider
      disabled={props.disabled ?? false}
      values={pluginValues}
      initialValues={{}}
      errors={{}}
      isSubmitting={isSubmitting}
      modified={Object.keys(pluginValues.plugins).length > 0}
      getValues={() => pluginValues}
      onChange={(eventOrPath, value) => {
        const [path, next] =
          typeof eventOrPath === 'string'
            ? [eventOrPath, value]
            : [eventOrPath.target.name, eventOrPath.target.value];

        setFieldValue(path, next);
      }}
      addFieldRow={noop}
      moveFieldRow={noop}
      removeFieldRow={noop}
      resetForm={noop}
      setErrors={noop}
      setSubmitting={noop}
      setValues={noop}
      validate={async () => ({ data: pluginValues })}
    >
      <PluginFormFields {...props} />
    </FormProvider>
  );
};

export { PluginFormFields, FormikPluginFormFields };
