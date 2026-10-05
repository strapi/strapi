import { useEffect, useRef, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, Modal, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useTracking, MEDIA_LIBRARY_LOCATION } from '../../../hooks/useTracking';
import { useCreateFolderMutation, useUpdateFolderMutation } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

interface FolderFormDialogBaseProps {
  open: boolean;
  onClose: () => void;
  /** Sent as `parent`. Create: the folder being created in. Rename: the folder's existing parent. */
  parentFolderId: number | null;
}

type FolderFormDialogProps = FolderFormDialogBaseProps &
  (
    | { mode: 'create'; parentFolderName: string }
    | { mode: 'rename'; folderId: number; initialName: string }
  );

const StyledModalContent = styled(Modal.Content)`
  max-width: 51.6rem;
`;

export const FolderFormDialog = (props: FolderFormDialogProps) => {
  const { open, parentFolderId, onClose, mode } = props;
  const initialName = props.mode === 'rename' ? props.initialName : '';

  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();
  const [name, setName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [createFolder, { isLoading: isCreating }] = useCreateFolderMutation();
  const [updateFolder, { isLoading: isUpdating }] = useUpdateFolderMutation();

  const isLoading = mode === 'rename' ? isUpdating : isCreating;

  useEffect(() => {
    if (open) {
      setName(initialName);
      setFieldError(undefined);

      // Renaming starts from the current name, so select it: typing replaces
      // the whole thing, as in Finder / VS Code / GitHub.
      if (mode === 'rename') {
        inputRef.current?.select();
      }
    }
  }, [open, initialName, mode]);

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
      if (props.mode === 'rename') {
        await updateFolder({
          id: props.folderId,
          name: trimmedName,
          parent: parentFolderId,
        }).unwrap();
        // Matches the legacy folder-edit payload. This dialog only renames
        // (parent is fixed), so the location never changes here.
        trackUsage('didEditMediaLibraryElements', {
          location: MEDIA_LIBRARY_LOCATION,
          type: 'folder',
          changeLocation: false,
        });
      } else {
        await createFolder({ name: trimmedName, parent: parentFolderId }).unwrap();
        trackUsage('didAddMediaLibraryFolders', { location: MEDIA_LIBRARY_LOCATION });
      }

      toggleNotification({
        type: 'success',
        message:
          mode === 'rename'
            ? formatMessage({
                id: getTranslationKey('folder.rename.success'),
                defaultMessage: 'Folder has been renamed',
              })
            : formatMessage({
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
          message:
            mode === 'rename'
              ? formatMessage({
                  id: getTranslationKey('folder.rename.form.error.unknown'),
                  defaultMessage: 'An error occurred while renaming the folder',
                })
              : formatMessage({
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
            {props.mode === 'rename'
              ? formatMessage({
                  id: getTranslationKey('folder.rename.title'),
                  defaultMessage: 'Rename folder',
                })
              : formatMessage(
                  {
                    id: getTranslationKey('folder.create.title-in'),
                    defaultMessage: 'New folder in {folderName}',
                  },
                  { folderName: props.parentFolderName }
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
                ref={inputRef}
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
              <Button
                type="submit"
                loading={isLoading}
                disabled={mode === 'rename' && name.trim() === initialName.trim()}
              >
                {mode === 'rename'
                  ? formatMessage({
                      id: getTranslationKey('folder.rename.submit'),
                      defaultMessage: 'Save',
                    })
                  : formatMessage({
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
