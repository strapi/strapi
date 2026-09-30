import { useMemo } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Button, Dialog, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../../utils/getTrad';

export type DeleteFolderMode = 'only' | 'withContent';

interface DeleteFolderDialogProps {
  counts: { contentTypes: number; subfolders: number; preservedContentTypes: number };
  conflictingFolderNames: string[];
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
  conflictingFolderNames,
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
            'You are about to delete the folder named {name} and its deletable contents ({contentTypes, plural, =0 {{subfolders, plural, one {# subfolder} other {# subfolders}}} one {# application content type{subfolders, plural, =0 {} one {, # subfolder} other {, # subfolders}}} other {# application content types{subfolders, plural, =0 {} one {, # subfolder} other {, # subfolders}}}}). Are you sure you want to proceed?',
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

  const isBlocked = mode === 'only' && conflictingFolderNames.length > 0;

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
            <Button variant={'danger'} onClick={onConfirm} fullWidth disabled={isBlocked}>
              {formatMessage({
                id: getTrad('nav.folder.delete.confirm'),
                defaultMessage: 'Yes, delete',
              })}
            </Button>
          </Dialog.Action>
        }
      >
        <Typography tag="span">{body}</Typography>
        {mode === 'withContent' && counts.preservedContentTypes > 0 && (
          <Typography tag="p">
            {formatMessage(
              {
                id: getTrad('nav.folder.delete-with-content.preserved'),
                defaultMessage:
                  '{preservedContentTypes, plural, one {# protected content type will be preserved and ungrouped.} other {# protected content types will be preserved and ungrouped.}}',
              },
              { preservedContentTypes: counts.preservedContentTypes }
            )}
          </Typography>
        )}
        {isBlocked && (
          <Typography tag="p">
            {formatMessage(
              {
                id: getTrad('nav.folder.delete.blocked'),
                defaultMessage:
                  'This folder cannot be deleted because these folder names already exist in its destination: {names}.',
              },
              { names: conflictingFolderNames.join(', ') }
            )}
          </Typography>
        )}
      </ConfirmDialog>
    </Dialog.Root>
  );
};
