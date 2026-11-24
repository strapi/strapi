import * as React from 'react';

import { Grid } from '@strapi/design-system';
import { useFormikContext } from 'formik';

import { useStrapiApp } from '../features/StrapiApp';

import { useForm } from './Form';

import type { FormFieldsForm, FormFieldsProps } from '../core/apis/FormFields';
import type { Data } from '@strapi/types';

type PluginValues = Record<string, unknown>;

interface PluginFormFieldsProps {
  form: FormFieldsForm;
  disabled?: boolean;
  entityId?: Data.ID;
}

interface FieldsProps extends PluginFormFieldsProps {
  values: PluginValues | undefined;
  errors: unknown;
  // Sets one plugin's path only, so plugins changing their values in the same render keep both
  setValue: (path: string, value: unknown) => void;
  replacedFields: FormFieldsProps['replacedFields'];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Errors on a field's items, such as `roles[0]`, come as an array or an object of messages
const firstMessage = (error: unknown): string | undefined => {
  if (typeof error === 'string') {
    return error;
  }

  if (error !== null && typeof error === 'object') {
    return Object.values(error).map(firstMessage).find(Boolean);
  }

  return undefined;
};

const Fields = ({
  form,
  disabled = false,
  entityId,
  values,
  errors,
  setValue,
  replacedFields,
}: FieldsProps) => {
  const formFields = useStrapiApp('PluginFormFields', (state) => state.formFields);

  // After a save, the forms set `plugins` back to undefined: remount the fields so each one loads
  // its saved values again from `entityId`
  const [generation, setGeneration] = React.useState(0);
  const hadValues = React.useRef(values !== undefined);

  React.useEffect(() => {
    if (hadValues.current && values === undefined) {
      setGeneration((current) => current + 1);
    }

    hadValues.current = values !== undefined;
  }, [values]);

  return (
    <>
      {formFields.get(form).map(({ pluginId, Component }) => (
        <Grid.Item
          key={`${pluginId}-${generation}`}
          col={12}
          direction="column"
          alignItems="stretch"
        >
          <Component
            value={values?.[pluginId]}
            error={isRecord(errors) ? errors[pluginId] : undefined}
            onChange={(value) => setValue(`plugins.${pluginId}`, value)}
            disabled={disabled}
            entityId={entityId}
            replacedFields={replacedFields}
          />
        </Grid.Item>
      ))}
    </>
  );
};

/**
 * The fields plugins add to a core form built with the admin `Form`, as `Grid.Item`s. Their values
 * are under `plugins`. The user forms let plugins replace the roles field.
 */
const PluginFormFields = (props: PluginFormFieldsProps) => {
  const values = useForm('PluginFormFields', (state) => state.values) as {
    plugins?: PluginValues;
    roles?: unknown;
  };
  const errors = useForm('PluginFormFields', (state) => state.errors) as Record<string, unknown>;
  const onChange = useForm('PluginFormFields', (state) => state.onChange);

  return (
    <Fields
      {...props}
      values={values.plugins}
      errors={errors.plugins}
      setValue={onChange}
      replacedFields={{
        roles: {
          value: values.roles,
          error: firstMessage(errors.roles),
          onChange: (value) => onChange('roles', value),
        },
      }}
    />
  );
};

/** {@link PluginFormFields} in a Formik form */
const FormikPluginFormFields = (props: PluginFormFieldsProps) => {
  const { values, errors, setFieldValue } = useFormikContext<{ plugins?: PluginValues }>();

  return (
    <Fields
      {...props}
      values={values.plugins}
      errors={errors.plugins}
      setValue={setFieldValue}
      replacedFields={{}}
    />
  );
};

export { PluginFormFields, FormikPluginFormFields };
