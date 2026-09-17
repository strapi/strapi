import * as React from 'react';

import {
  ConfirmDialog,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { Badge, Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDiscardDocumentChangesMutation, useGetBranchStatesQuery } from '../services/branches';
import { getTranslation } from '../utils/getTranslation';
import { useBranches } from './useBranches';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

/**
 * Edit-view side panel listing what the document carries on the current
 * branch, with a way back to the parent's version. Nothing on main.
 */
export const BranchChangesPanel: PanelComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { current, isOnMain, parentOf } = useBranches();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale;
  const { data } = useGetBranchStatesQuery(
    { contentType: model, documentIds: documentId ? [documentId] : [] },
    { skip: !documentId || isOnMain }
  );
  const [discard, { isLoading }] = useDiscardDocumentChangesMutation();
  const [open, setOpen] = React.useState(false);

  if (isOnMain || !current || current.id === null || !documentId) {
    return null;
  }
  const info = data?.[documentId];
  if (!info || info.state === 'inherited' || info.state === 'deleted') {
    return null;
  }

  const parent = parentOf(current);
  const parentName = parent?.name ?? 'Main';

  const handleDiscard = async () => {
    try {
      await discard({ id: current.id as number, contentType: model, documentId, locale }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('panel.discarded'),
          defaultMessage: 'Branch changes discarded.',
        }),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setOpen(false);
  };

  return {
    title: formatMessage({ id: getTranslation('panel.title'), defaultMessage: 'Branch changes' }),
    content: (
      <Flex direction="column" alignItems="stretch" gap={3}>
        {info.state === 'created' ? (
          <Typography variant="pi" textColor="neutral600">
            {formatMessage(
              {
                id: getTranslation('panel.created'),
                defaultMessage:
                  'This document only exists on {branch}. It will appear on {parent} when the branch is merged.',
              },
              { branch: current.name, parent: parentName }
            )}
          </Typography>
        ) : (
          <>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage(
                {
                  id: getTranslation('panel.description'),
                  defaultMessage: 'Attributes changed on {branch} compared to {parent}.',
                },
                { branch: current.name, parent: parentName }
              )}
            </Typography>
            <Flex gap={1} wrap="wrap">
              {info.attributes.map((attribute) => (
                <Badge key={attribute}>{attribute}</Badge>
              ))}
            </Flex>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger>
                <Button variant="danger-light" size="S" fullWidth loading={isLoading}>
                  {formatMessage({
                    id: getTranslation('panel.discard'),
                    defaultMessage: 'Discard branch changes',
                  })}
                </Button>
              </Dialog.Trigger>
              <ConfirmDialog onConfirm={handleDiscard}>
                {formatMessage(
                  {
                    id: getTranslation('panel.discard.confirm'),
                    defaultMessage:
                      'Discard the changes made to this document on {branch}? It will go back to the {parent} version.',
                  },
                  { branch: current.name, parent: parentName }
                )}
              </ConfirmDialog>
            </Dialog.Root>
          </>
        )}
      </Flex>
    ),
  };
};
