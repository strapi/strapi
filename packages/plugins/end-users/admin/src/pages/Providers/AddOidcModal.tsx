import * as React from 'react';

import {
  Form,
  translatedErrors,
  UnsavedChangesModal,
  useAPIErrorHandler,
  useNotification,
} from '@strapi/admin/strapi-admin';
import { Button, Flex, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { TextField } from '../../components/FormFields';
import { useCreateProviderMutation } from '../../services/providers';
import { getTranslation } from '../../utils/getTranslation';
import { getFormErrors } from '../../utils/validationErrors';

import type { FormErrors, FormHelpers } from '@strapi/admin/strapi-admin';

interface AddOidcModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the new provider's id, once it is made */
  onCreated: (id: string) => void;
}

interface OidcValues {
  name: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
}

const INITIAL_VALUES: OidcValues = { name: '', discoveryUrl: '', clientId: '', clientSecret: '' };

const FIELDS = Object.keys(INITIAL_VALUES) as Array<keyof OidcValues>;

/** Makes a custom OpenID Connect provider: a name, its discovery URL and the client's credentials */
const AddOidcModal = ({ open, onClose, onCreated }: AddOidcModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [create] = useCreateProviderMutation();

  const handleSubmit = async (values: OidcValues, { setErrors }: FormHelpers<OidcValues>) => {
    // Every field is required: the server is asked only once none is empty
    const missing = FIELDS.filter((name) => values[name].trim() === '');

    if (missing.length > 0) {
      setErrors(
        Object.fromEntries(
          missing.map((name) => [name, translatedErrors.required])
        ) as FormErrors<OidcValues>
      );

      return;
    }

    const result = await create({ ...values, name: values.name.trim() });

    if ('error' in result) {
      const fieldErrors = getFormErrors(result.error);
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;

      setErrors(fieldErrors as FormErrors<OidcValues>);
      toggleNotification({
        type: 'danger',
        message: hasFieldErrors
          ? formatMessage({
              id: getTranslation('providers.save-failed'),
              defaultMessage: 'Check the fields marked with an error.',
            })
          : formatAPIError(result.error),
      });

      return;
    }

    onCreated(result.data.id);
  };

  return (
    <UnsavedChangesModal open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('providers.oidc.title'),
              defaultMessage: 'Add a custom OIDC provider',
            })}
          </Modal.Title>
        </Modal.Header>
        <Form method="POST" initialValues={INITIAL_VALUES} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <>
              <Modal.Body>
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <TextField
                    name="name"
                    label={formatMessage({
                      id: getTranslation('providers.oidc.name'),
                      defaultMessage: 'Name',
                    })}
                    autoComplete="off"
                    required
                  />
                  <TextField
                    name="discoveryUrl"
                    type="url"
                    label={formatMessage({
                      id: getTranslation('providers.discovery-url'),
                      defaultMessage: 'Discovery URL',
                    })}
                    autoComplete="off"
                    required
                  />
                  <TextField
                    name="clientId"
                    label={formatMessage({
                      id: getTranslation('providers.client-id'),
                      defaultMessage: 'Client ID',
                    })}
                    autoComplete="off"
                    required
                  />
                  <TextField
                    name="clientSecret"
                    type="password"
                    label={formatMessage({
                      id: getTranslation('providers.client-secret'),
                      defaultMessage: 'Client secret',
                    })}
                    autoComplete="off"
                    required
                  />
                </Flex>
              </Modal.Body>
              <Modal.Footer>
                <Modal.Close>
                  <Button variant="tertiary" type="button">
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                </Modal.Close>
                <Button type="submit" loading={isSubmitting}>
                  {formatMessage({
                    id: getTranslation('providers.oidc.create'),
                    defaultMessage: 'Add provider',
                  })}
                </Button>
              </Modal.Footer>
            </>
          )}
        </Form>
      </Modal.Content>
    </UnsavedChangesModal>
  );
};

export { AddOidcModal };
export type { AddOidcModalProps };
