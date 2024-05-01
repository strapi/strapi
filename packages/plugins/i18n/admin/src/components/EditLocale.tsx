import * as React from 'react';

import {
  useNotification,
  useAPIErrorHandler,
  Form,
  FormHelpers,
  useAuth,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Divider,
  Flex,
  IconButton,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  ModalLayoutProps,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  Typography,
} from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Locale, UpdateLocale } from '../../../shared/contracts/locales';
import { useUpdateLocaleMutation } from '../services/locales';
import { isBaseQueryError } from '../utils/baseQuery';
import { getTranslation } from '../utils/getTranslation';

import { AdvancedForm, BaseForm, LOCALE_SCHEMA, SubmitButton } from './CreateLocale';

/* -------------------------------------------------------------------------------------------------
 * EditLocale
 * -----------------------------------------------------------------------------------------------*/

interface EditLocaleProps extends Omit<EditModalProps, 'onClose'> {}

const EditLocale = (props: EditLocaleProps) => {
  const { formatMessage } = useIntl();
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <IconButton
        onClick={() => setVisible(true)}
        label={formatMessage(
          {
            id: getTranslation('Settings.list.actions.edit'),
            defaultMessage: 'Edit {name} locale',
          },
          {
            name: props.name,
          }
        )}
        icon={<Pencil />}
        borderWidth={0}
      />
      {visible ? <EditModal {...props} onClose={() => setVisible(false)} /> : null}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EditModal
 * -----------------------------------------------------------------------------------------------*/

interface EditModalProps
  extends Pick<ModalLayoutProps, 'onClose'>,
    Pick<Locale, 'id' | 'isDefault' | 'name' | 'code'> {}

type FormValues = UpdateLocale.Request['body'] & { code: string };

/**
 * @internal
 * @description Exported to be used when someone clicks on a table row.
 */
const EditModal = ({ id, code, isDefault, name, onClose }: EditModalProps) => {
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const refetchPermissions = useAuth('EditModal', (state) => state.refetchPermissions);
  const { formatMessage } = useIntl();
  const titleId = React.useId();

  const [updateLocale] = useUpdateLocaleMutation();
  const handleSubmit = async (
    { code: _code, ...data }: FormValues,
    helpers: FormHelpers<FormValues>
  ) => {
    try {
      /**
       * We don't need to send the code, because the
       * code can never be changed.
       */
      const res = await updateLocale({
        id,
        ...data,
      });

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
          id: getTranslation('Settings.locales.modal.edit.success'),
          defaultMessage: 'Updated locale',
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

  return (
    <ModalLayout onClose={onClose} labelledBy={titleId}>
      <Form
        method="PUT"
        onSubmit={handleSubmit}
        initialValues={{
          code,
          name,
          isDefault,
        }}
        validationSchema={LOCALE_SCHEMA}
      >
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" tag="h2" id={titleId}>
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
                  <BaseForm mode="edit" />
                </TabPanel>
                <TabPanel>
                  <AdvancedForm isDefaultLocale={isDefault} />
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

export { EditLocale, EditModal };
