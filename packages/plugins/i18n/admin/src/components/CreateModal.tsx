import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Form, translatedErrors, useRBACProvider } from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Formik, useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { CreateLocale } from '../../../shared/contracts/locales';
import { useAddLocale } from '../hooks/useAddLocale';
import { getTranslation } from '../utils/getTranslation';

import { LocaleSelect, LocaleSelectProps } from './LocaleSelect';

/* -------------------------------------------------------------------------------------------------
 * CreateModal
 * -----------------------------------------------------------------------------------------------*/

const LOCALE_SCHEMA = yup.object().shape({
  code: yup.string().required(),
  name: yup
    .string()
    .max(50, 'Settings.locales.modal.locales.displayName.error')
    .required(translatedErrors.required),
  isDefault: yup.boolean(),
});

type FormikValues = CreateLocale.Request['body'];

const initialFormValues = {
  code: '',
  name: '',
  isDefault: false,
} satisfies FormikValues;

type ModalCreateProps = {
  onClose: () => void;
};

const CreateModal = ({ onClose }: ModalCreateProps) => {
  const { isAdding, addLocale } = useAddLocale();
  const { formatMessage } = useIntl();
  const { refetchPermissions } = useRBACProvider();

  return (
    <ModalLayout onClose={onClose} labelledBy="add-locale-title">
      <Formik
        initialValues={initialFormValues}
        onSubmit={async (values) => {
          /**
           * No need to explicitly call the onClose prop here
           * since the all tree (from the root of the page) is destroyed and re-mounted
           * because of the RBAC refreshing and the potential move of the default locale
           */
          await addLocale(values);

          await refetchPermissions();
        }}
        validationSchema={LOCALE_SCHEMA}
        validateOnChange={false}
      >
        <Form>
          <ModalHeader>
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="add-locale-title">
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
              id="tabs"
              variant="simple"
            >
              <Flex justifyContent="space-between">
                <Typography as="h2" variant="beta">
                  {formatMessage({
                    id: getTranslation('Settings.locales.modal.title'),
                    defaultMessage: 'Configurations',
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
            endActions={
              <Button type="submit" startIcon={<Check />} disabled={isAdding}>
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
          />
        </Form>
      </Formik>
    </ModalLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BaseForm
 * -----------------------------------------------------------------------------------------------*/

const BaseForm = () => {
  const { formatMessage } = useIntl();
  const { values, handleChange, setFieldValue, errors } = useFormikContext<FormikValues>();

  /**
   * This is needed because the LocaleSelect component is a memoized component
   * since it renders ~500 locales and that formik would trigger a re-render on it without
   * it
   */
  const handleLocaleChange: LocaleSelectProps['onLocaleChange'] = (nextLocale) => {
    setFieldValue('name', nextLocale.name);
    setFieldValue('code', nextLocale.code);
  };
  const handleClear = () => {
    setFieldValue('displayName', '');
    setFieldValue('code', '');
  };

  return (
    <Grid gap={4}>
      <GridItem col={6}>
        <LocaleSelect
          error={errors.code}
          value={values.code}
          onLocaleChange={handleLocaleChange}
          onClear={handleClear}
        />
      </GridItem>

      <GridItem col={6}>
        <TextInput
          name="name"
          label={formatMessage({
            id: getTranslation('Settings.locales.modal.locales.displayName'),
            defaultMessage: 'Locale display name',
          })}
          hint={formatMessage({
            id: getTranslation('Settings.locales.modal.locales.displayName.description'),
            defaultMessage: 'Locale will be displayed under that name in the administration panel',
          })}
          error={
            errors.name
              ? formatMessage({
                  id: getTranslation('Settings.locales.modal.locales.displayName.error'),
                  defaultMessage: 'The locale display name can only be less than 50 characters.',
                })
              : undefined
          }
          value={values.name}
          onChange={handleChange}
        />
      </GridItem>
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
  const { values, setFieldValue } = useFormikContext<FormikValues>();
  const { formatMessage } = useIntl();

  return (
    <Checkbox
      name="isDefault"
      hint={formatMessage({
        id: getTranslation('Settings.locales.modal.advanced.setAsDefault.hint'),
        defaultMessage: 'One default locale is required, change it by selecting another one',
      })}
      onChange={() => setFieldValue('isDefault', !values.isDefault)}
      value={values.isDefault}
      disabled={isDefaultLocale}
    >
      {formatMessage({
        id: getTranslation('Settings.locales.modal.advanced.setAsDefault'),
        defaultMessage: 'Set as default locale',
      })}
    </Checkbox>
  );
};

export { CreateModal, AdvancedForm, LOCALE_SCHEMA };
