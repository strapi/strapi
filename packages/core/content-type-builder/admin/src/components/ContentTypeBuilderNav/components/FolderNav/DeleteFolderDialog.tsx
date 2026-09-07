import { useMemo } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Button, Dialog, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../../utils/getTrad';

export type DeleteFolderMode = 'only' | 'withContent';

interface DeleteFolderDialogProps {
  counts: { contentTypes: number; subfolders: number };
  onOpenChange: (open: boolean) => void;
  mode: DeleteFolderMode;
  onConfirm: () => void;
  folderName: string;
  open: boolean;
}

export const DeleteFolderDialog = ({
  onOpenChange,
  folderName,
  onConfirm,
  counts,
  open,
  mode,
}: DeleteFolderDialogProps) => {
  const { formatMessage } = useIntl();

  const title = useMemo(() => {
    if (mode === 'withContent') {
      return formatMessage({
        id: getTrad('nav.folder.delete-with-content.title'),
        defaultMessage: 'Delete folder and contents',
      });
    }

    return formatMessage({
      id: getTrad('nav.folder.delete.title'),
      defaultMessage: 'Delete folder',
    });
  }, [formatMessage, mode]);

  const body = useMemo(() => {
    if (mode === 'withContent') {
      return formatMessage(
        {
          id: getTrad('nav.folder.delete-with-content.body'),
          defaultMessage:
            'You are about to delete the folder named {name} and all its contents ({contentTypes, plural, =0 {{subfolders, plural, one {# subfolder} other {# subfolders}}} one {# content type{subfolders, plural, =0 {} one {, # subfolder} other {, # subfolders}}} other {# content types{subfolders, plural, =0 {} one {, # subfolder} other {, # subfolders}}}}). Are you sure you want to proceed?',
        },
        { name: <Typography fontWeight="bold">{folderName}</Typography>, ...counts }
      );
    }

    return formatMessage(
      {
        id: getTrad('nav.folder.delete.body'),
        defaultMessage:
          'You are about to delete the folder named {name}. Are you sure you want to proceed?',
      },
      { name: <Typography fontWeight="bold">{folderName}</Typography> }
    );
  }, [formatMessage, folderName, mode, counts]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <ConfirmDialog
        title={title}
        startAction={
          <Dialog.Cancel>
            <Button fullWidth variant="tertiary">
              {formatMessage({
                id: getTrad('nav.folder.delete.cancel'),
                defaultMessage: 'No, cancel',
              })}
            </Button>
          </Dialog.Cancel>
        }
        endAction={
          <Dialog.Action>
            <Button variant={'danger'} onClick={onConfirm} fullWidth>
              {formatMessage({
                id: getTrad('nav.folder.delete.confirm'),
                defaultMessage: 'Yes, delete',
              })}
            </Button>
          </Dialog.Action>
        }
      >
        <Typography tag="span">{body}</Typography>
      </ConfirmDialog>
    </Dialog.Root>
  );
};
