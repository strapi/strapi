import * as React from 'react';

import {
  Form,
  type InputProps,
  InputRenderer,
  useField,
  type FormHelpers,
  useForm,
  useAPIErrorHandler,
  useNotification,
  useAuth,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  ButtonProps,
  Divider,
  Flex,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  SingleSelect,
  SingleSelectOption,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  Typography,
} from '@strapi/design-system';
import { Check, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { CreateLocale } from '../../../shared/contracts/locales';
import {
  useCreateLocaleMutation,
  useGetDefaultLocalesQuery,
  useGetLocalesQuery,
} from '../services/locales';
import { isBaseQueryError } from '../utils/baseQuery';
import { getTranslation } from '../utils/getTranslation';

/* -------------------------------------------------------------------------------------------------
 * CreateLocale
 * -----------------------------------------------------------------------------------------------*/

interface CreateLocaleProps extends Pick<ButtonProps, 'disabled' | 'variant'> {}

const CreateLocale = ({ disabled, variant = 'default' }: CreateLocaleProps) => {
  const { formatMessage } = useIntl();
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        startIcon={<Plus />}
        onClick={() => setVisible(true)}
        size="S"
      >
        {formatMessage({
          id: getTranslation('Settings.list.actions.add'),
          defaultMessage: 'Add new locale',
        })}
      </Button>
      {visible ? <CreateModal onClose={() => setVisible(false)} /> : null}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * CreateModal
 * -----------------------------------------------------------------------------------------------*/

const LOCALE_SCHEMA = yup.object().shape({
  code: yup.string().required({
    id: 'Settings.locales.modal.create.code.error',
    defaultMessage: 'Please select a locale',
  }),
  name: yup
    .string()
    .max(50, {
      id: 'Settings.locales.modal.create.name.error.min',
      defaultMessage: 'The locale display name can only be less than 50 characters.',
    })
    .required({
      id: 'Settings.locales.modal.create.name.error.required',
      defaultMessage: 'Please give the locale a display name',
    }),
  isDefault: yup.boolean(),
});

type FormValues = CreateLocale.Request['body'];

const initialFormValues = {
  code: '',
  name: '',
  isDefault: false,
} satisfies FormValues;

type ModalCreateProps = {
  onClose: () => void;
};

const CreateModal = ({ onClose }: ModalCreateProps) => {
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const [createLocale] = useCreateLocaleMutation();
  const { formatMessage } = useIntl();
  const refetchPermissions = useAuth('CreateModal', (state) => state.refetchPermissions);

  const handleSubmit = async (values: FormValues, helpers: FormHelpers<FormValues>) => {
    try {
      const res = await createLocale(values);

      if ('error' in res) {
        if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
          helpers.setErrors(formatValidationErrors(res.error));
        } else {
          toggleNotification({ type: 'danger', message: formatAPIError(res.error) });
        }

        return;
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('Settings.locales.modal.create.success'),
          defaultMessage: 'Created locale',
        }),
      });

      refetchPermissions();
      onClose();
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again',
        }),
      });
    }
  };

  const titleId = React.useId();

  return (
    <ModalLayout onClose={onClose} labelledBy={titleId}>
      <Form
        method="POST"
        initialValues={initialFormValues}
        validationSchema={LOCALE_SCHEMA}
        onSubmit={handleSubmit}
      >
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" tag="h2" id={titleId}>
            {formatMessage({
              id: getTranslation('Settings.list.actions.add'),
              defaultMessage: 'Add new locale',
            })}
          </Typography>
        </ModalHeader>
        <ModalBody>
          <TabGroup
            label={formatMessage({
              id: getTranslation('Settings.locales.modal.title'),
              defaultMessage: 'Configurations',
            })}
            variant="simple"
          >
            <Flex justifyContent="space-between">
              <Typography tag="h2" variant="beta">
                {formatMessage({
                  id: getTranslation('Settings.locales.modal.title'),
                  defaultMessage: 'Configuration',
                })}
              </Typography>
              <Tabs>
                <Tab>
                  {formatMessage({
                    id: getTranslation('Settings.locales.modal.base'),
                    defaultMessage: 'Basic settings',
                  })}
                </Tab>
                <Tab>
                  {formatMessage({
                    id: getTranslation('Settings.locales.modal.advanced'),
                    defaultMessage: 'Advanced settings',
                  })}
                </Tab>
              </Tabs>
            </Flex>

            <Divider />

            <Box paddingTop={7} paddingBottom={7}>
              <TabPanels>
                <TabPanel>
                  <BaseForm />
                </TabPanel>
                <TabPanel>
                  <AdvancedForm />
                </TabPanel>
              </TabPanels>
            </Box>
          </TabGroup>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button variant="tertiary" onClick={onClose}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={<SubmitButton />}
        />
      </Form>
    </ModalLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SubmitButton
 * -----------------------------------------------------------------------------------------------*/

const SubmitButton = () => {
  const { formatMessage } = useIntl();
  const isSubmitting = useForm('SubmitButton', (state) => state.isSubmitting);
  const modified = useForm('SubmitButton', (state) => state.modified);

  return (
    <Button type="submit" startIcon={<Check />} disabled={isSubmitting || !modified}>
      {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
    </Button>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BaseForm
 * -----------------------------------------------------------------------------------------------*/

interface BaseFormProps {
  mode?: 'create' | 'edit';
}

const BaseForm = ({ mode = 'create' }: BaseFormProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data: defaultLocales = [], error } = useGetDefaultLocalesQuery();
  const { data: locales = [] } = useGetLocalesQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  if (!Array.isArray(defaultLocales) || !Array.isArray(locales)) {
    return null;
  }

  const options = defaultLocales.map((locale) => ({
    label: locale.name,
    value: locale.code,
  }));

  const translatedForm = [
    {
      disabled: mode !== 'create',
      label: {
        id: getTranslation('Settings.locales.modal.create.code.label'),
        defaultMessage: 'Locales',
      },
      name: 'code',
      options,
      placeholder: {
        id: 'components.placeholder.select',
        defaultMessage: 'Select',
      },
      required: true,
      size: 6,
      type: 'enumeration' as const,
    },
    {
      hint: {
        id: getTranslation('Settings.locales.modal.create.name.label.description'),
        defaultMessage: 'Locale will be displayed under that name in the administration panel',
      },
      label: {
        id: getTranslation('Settings.locales.modal.create.name.label'),
        defaultMessage: 'Locale display name',
      },
      name: 'name',
      required: true,
      size: 6,
      type: 'string' as const,
    },
  ].map((field) => ({
    ...field,
    hint: field.hint ? formatMessage(field.hint) : undefined,
    label: formatMessage(field.label),
    placeholder: field.placeholder ? formatMessage(field.placeholder) : undefined,
  }));

  return (
    <Grid gap={4}>
      {translatedForm.map(({ size, ...field }) => (
        <GridItem key={field.name} col={size}>
          <FormRenderer {...field} />
        </GridItem>
      ))}
    </Grid>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AdvancedForm
 * -----------------------------------------------------------------------------------------------*/

type AdvancedFormProps = {
  isDefaultLocale?: boolean;
};

const AdvancedForm = ({ isDefaultLocale }: AdvancedFormProps) => {
  const { formatMessage } = useIntl();

  const form = [
    {
      disabled: isDefaultLocale,
      hint: {
        id: getTranslation('Settings.locales.modal.advanced.setAsDefault.hint'),
        defaultMessage: 'One default locale is required, change it by selecting another one',
      },
      label: {
        id: getTranslation('Settings.locales.modal.advanced.setAsDefault'),
        defaultMessage: 'Set as default locale',
      },
      name: 'isDefault',
      size: 6,
      type: 'boolean' as const,
    },
  ].map((field) => ({
    ...field,
    hint: field.hint ? formatMessage(field.hint) : undefined,
    label: formatMessage(field.label),
  })) satisfies InputProps[];

  return (
    <Grid gap={4}>
      {form.map(({ size, ...field }) => (
        <GridItem key={field.name} col={size}>
          <FormRenderer {...field} />
        </GridItem>
      ))}
    </Grid>
  );
};

/* -------------------------------------------------------------------------------------------------
 * FormRenderer
 * -----------------------------------------------------------------------------------------------*/

const FormRenderer = (field: InputProps) => {
  switch (field.type) {
    /**
     * This will override the default input renderer
     * choice for `enumeration`.
     */
    case 'enumeration':
      return <EnumerationInput {...field} />;
    default:
      return <InputRenderer {...field} />;
  }
};

const EnumerationInput = ({
  disabled,
  hint,
  label,
  name,
  options,
  placeholder,
  required,
}: Extract<InputProps, { type: 'enumeration' }>) => {
  const { value, error, onChange } = useField(name);
  const { data: defaultLocales = [] } = useGetDefaultLocalesQuery();

  const handleChange = (value: string) => {
    if (Array.isArray(defaultLocales)) {
      // We know it exists because the options are created from the list of default locales
      const locale = defaultLocales.find((locale) => locale.code === value)!;

      onChange(name, value);
      // This lets us automatically fill the name field with the locale name
      onChange('name', locale.name);
    } else {
      onChange(name, value);
    }
  };

  return (
    <SingleSelect
      disabled={disabled}
      error={error}
      hint={hint}
      // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
      label={label}
      name={name}
      // @ts-expect-error – This will dissapear when the DS removes support for numbers to be returned by SingleSelect.
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      value={value}
    >
      {options.map((option) => (
        <SingleSelectOption value={option.value} key={option.value}>
          {option.label}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

export { CreateLocale, BaseForm, AdvancedForm, SubmitButton, LOCALE_SCHEMA };
