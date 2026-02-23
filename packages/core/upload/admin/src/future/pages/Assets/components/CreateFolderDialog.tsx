import { useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, Modal, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useCreateFolderMutation } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

import type { FetchError } from '@strapi/admin/strapi-admin';

interface CreateFolderDialogProps {
  parentFolderId: number | null;
  onClose: () => void;
}

export const CreateFolderDialog = ({ parentFolderId, onClose }: CreateFolderDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [createFolder, { isLoading }] = useCreateFolderMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFieldError(
        formatMessage({
          id: getTranslationKey('folder.create.form.error.name-required'),
          defaultMessage: 'Name is required',
        })
      );
      return;
    }

    try {
      await createFolder({ name: trimmedName, parent: parentFolderId }).unwrap();

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslationKey('folder.create.success'),
          defaultMessage: 'Folder has been created',
        }),
      });

      onClose();
    } catch (err) {
      const fetchError = err as FetchError;
      const apiError = fetchError?.response?.data?.error;

      if (apiError?.message) {
        setFieldError(apiError.message);
      } else {
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: getTranslationKey('folder.create.form.error.unknown'),
            defaultMessage: 'An error occurred while creating the folder',
          }),
        });
      }
    }
  };

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslationKey('folder.create.title'),
              defaultMessage: 'New folder',
            })}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <Field.Root error={fieldError} name="name" required>
              <Field.Label>
                {formatMessage({
                  id: getTranslationKey('folder.form.name.label'),
                  defaultMessage: 'Folder name',
                })}
              </Field.Label>
              <TextInput
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  setFieldError(undefined);
                }}
                autoFocus
              />
              <Field.Error />
            </Field.Root>
          </Modal.Body>
          <Modal.Footer>
            <Flex gap={2} justifyContent="flex-end" width="100%">
              <Button variant="tertiary" onClick={onClose} type="button">
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button type="submit" loading={isLoading}>
                {formatMessage({
                  id: getTranslationKey('folder.create.submit'),
                  defaultMessage: 'Create folder',
                })}
              </Button>
            </Flex>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};
