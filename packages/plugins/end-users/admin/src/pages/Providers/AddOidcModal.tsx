import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, Modal, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useCreateProviderMutation } from '../../services/providers';
import { getTranslation } from '../../utils/getTranslation';
import { getFieldErrors } from '../../utils/validationErrors';

interface AddOidcModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the new provider's id, once it is made */
  onCreated: (id: string) => void;
}

/** Makes a custom OpenID Connect provider: a name, its discovery URL and the client's credentials */
const AddOidcModal = ({ open, onClose, onCreated }: AddOidcModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [create, { isLoading }] = useCreateProviderMutation();
  const [values, setValues] = React.useState({
    name: '',
    discoveryUrl: '',
    clientId: '',
    clientSecret: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setValues({ name: '', discoveryUrl: '', clientId: '', clientSecret: '' });
      setErrors({});
    }
  }, [open]);

  const handleCreate = async () => {
    const result = await create({ ...values, name: values.name.trim() });

    if ('error' in result) {
      setErrors(getFieldErrors(result.error));
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });

      return;
    }

    onCreated(result.data.id);
  };

  const input = (
    name: keyof typeof values,
    label: string,
    type: 'text' | 'url' | 'password' = 'text'
  ) => (
    <Field.Root name={name} error={errors[name]} required>
      <Field.Label>{label}</Field.Label>
      <TextInput
        type={type}
        autoComplete="off"
        value={values[name]}
        onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
      />
      <Field.Error />
    </Field.Root>
  );

  return (
    <Modal.Root open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('providers.oidc.title'),
              defaultMessage: 'Add a custom OIDC provider',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            {input(
              'name',
              formatMessage({ id: getTranslation('providers.oidc.name'), defaultMessage: 'Name' })
            )}
            {input(
              'discoveryUrl',
              formatMessage({
                id: getTranslation('providers.discovery-url'),
                defaultMessage: 'Discovery URL',
              }),
              'url'
            )}
            {input(
              'clientId',
              formatMessage({
                id: getTranslation('providers.client-id'),
                defaultMessage: 'Client ID',
              })
            )}
            {input(
              'clientSecret',
              formatMessage({
                id: getTranslation('providers.client-secret'),
                defaultMessage: 'Client secret',
              }),
              'password'
            )}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          </Modal.Close>
          <Button loading={isLoading} onClick={handleCreate}>
            {formatMessage({
              id: getTranslation('providers.oidc.create'),
              defaultMessage: 'Add provider',
            })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { AddOidcModal };
export type { AddOidcModalProps };
