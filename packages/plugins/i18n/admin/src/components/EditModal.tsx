import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  ModalLayoutProps,
  SingleSelect,
  SingleSelectOption,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Form, useRBACProvider } from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Formik, useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

import { CreateLocale } from '../../../shared/contracts/locales';
import { useDefaultLocales } from '../hooks/useDefaultLocales';
import { useEditLocale } from '../hooks/useEditLocale';
import { Locale } from '../store/reducers';
import { getTranslation } from '../utils/getTranslation';

import { AdvancedForm, LOCALE_SCHEMA } from './CreateModal';

/* -------------------------------------------------------------------------------------------------
 * EditModal
 * -----------------------------------------------------------------------------------------------*/

interface EditModalProps extends Pick<ModalLayoutProps, 'onClose'> {
  locale: Locale;
}

type FormikValues = CreateLocale.Request['body'];

const EditModal = ({ locale, onClose }: EditModalProps) => {
  const { refetchPermissions } = useRBACProvider();
  const { isEditing, editLocale } = useEditLocale();
  const { formatMessage } = useIntl();

  const handleSubmit = async ({ name, isDefault }: FormikValues) => {
    await editLocale(locale.id, { name, isDefault });
    await refetchPermissions();
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="edit-locale-title">
      <Formik
        initialValues={
          {
            code: locale.code ?? '',
            name: locale.name ?? '',
            isDefault: Boolean(locale.isDefault),
          } satisfies FormikValues
        }
        onSubmit={handleSubmit}
        validationSchema={LOCALE_SCHEMA}
      >
        <Form>
          <ModalHeader>
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="edit-locale-title">
              {formatMessage({
                id: getTranslation('Settings.list.actions.edit'),
                defaultMessage: 'Edit a locale',
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
                <Typography as="h2">
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
                    <BaseForm locale={locale} />
                  </TabPanel>
                  <TabPanel>
                    <AdvancedForm isDefaultLocale={Boolean(locale && locale.isDefault)} />
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
              <Button type="submit" startIcon={<Check />} disabled={isEditing}>
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

interface BaseFormProps extends Pick<EditModalProps, 'locale'> {}

const BaseForm = ({ locale }: BaseFormProps) => {
  const { formatMessage } = useIntl();
  const { values, handleChange, errors } = useFormikContext<FormikValues>();
  const { defaultLocales = [] } = useDefaultLocales();

  const localeDetails = defaultLocales.find((row) => row.code === locale.code);

  return (
    <Grid gap={4}>
      <GridItem col={6}>
        <SingleSelect
          label={formatMessage({
            id: getTranslation('Settings.locales.modal.locales.label'),
            defaultMessage: 'Locales',
          })}
          value={localeDetails?.code || locale.code}
          disabled
        >
          <SingleSelectOption value={localeDetails?.code || locale.code}>
            {localeDetails?.name || locale.code}
          </SingleSelectOption>
        </SingleSelect>
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

export { EditModal };
