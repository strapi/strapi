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
  Modal,
  Tabs,
  Typography,
  useId,
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

interface EditLocaleProps extends Omit<EditModalProps, 'open' | 'onOpenChange'> {}

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
        variant="ghost"
      >
        <Pencil />
      </IconButton>
      <EditModal {...props} open={visible} onOpenChange={setVisible} />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EditModal
 * -----------------------------------------------------------------------------------------------*/

interface EditModalProps extends Pick<Locale, 'id' | 'isDefault' | 'name' | 'code'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = UpdateLocale.Request['body'] & { code: string };

/**
 * @internal
 * @description Exported to be used when someone clicks on a table row.
 */
const EditModal = ({ id, code, isDefault, name, open, onOpenChange }: EditModalProps) => {
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const refetchPermissions = useAuth('EditModal', (state) => state.refetchPermissions);
  const { formatMessage } = useIntl();
  const titleId = useId();

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
      onOpenChange(false);
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
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
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
          <Modal.Header>
            <Modal.Title>
              {formatMessage(
                {
                  id: getTranslation('Settings.list.actions.edit'),
                  defaultMessage: 'Edit a locale',
                },
                {
                  name,
                }
              )}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Tabs.Root variant="simple" defaultValue="basic">
              <Flex justifyContent="space-between">
                <Typography tag="h2" variant="beta" id={titleId}>
                  {formatMessage({
                    id: getTranslation('Settings.locales.modal.title'),
                    defaultMessage: 'Configuration',
                  })}
                </Typography>
                <Tabs.List aria-labelledby={titleId}>
                  <Tabs.Trigger value="basic">
                    {formatMessage({
                      id: getTranslation('Settings.locales.modal.base'),
                      defaultMessage: 'Basic settings',
                    })}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="advanced">
                    {formatMessage({
                      id: getTranslation('Settings.locales.modal.advanced'),
                      defaultMessage: 'Advanced settings',
                    })}
                  </Tabs.Trigger>
                </Tabs.List>
              </Flex>
              <Divider />
              <Box paddingTop={7} paddingBottom={7}>
                <Tabs.Content value="basic">
                  <BaseForm mode="edit" />
                </Tabs.Content>
                <Tabs.Content value="advanced">
                  <AdvancedForm isDefaultLocale={isDefault} />
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
            </Modal.Close>
            <SubmitButton />
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </Modal.Root>
  );
};

export { EditLocale, EditModal };
