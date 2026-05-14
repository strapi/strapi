import { useEffect, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, Modal, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useCreateFolderMutation } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

interface CreateFolderDialogProps {
  open: boolean;
  folderName: string;
  parentFolderId: number | null;
  onClose: () => void;
}

const StyledModalContent = styled(Modal.Content)`
  max-width: 51.6rem;
`;

export const CreateFolderDialog = ({
  open,
  folderName,
  parentFolderId,
  onClose,
}: CreateFolderDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [createFolder, { isLoading }] = useCreateFolderMutation();

  useEffect(() => {
    if (open) {
      setName('');
      setFieldError(undefined);
    }
  }, [open]);

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
      const apiError = err as { message?: string };

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
    <Modal.Root open={open} onOpenChange={onClose}>
      <StyledModalContent>
        <Modal.Header>
          <Modal.Title>
            {formatMessage(
              {
                id: getTranslationKey('folder.create.title-in'),
                defaultMessage: 'New folder in {folderName}',
              },
              { folderName }
            )}
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
            <Flex gap={2} justifyContent="space-between" width="100%">
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
      </StyledModalContent>
    </Modal.Root>
  );
};
