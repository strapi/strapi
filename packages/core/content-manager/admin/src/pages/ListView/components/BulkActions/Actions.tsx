import * as React from 'react';

import {
  useStrapiApp,
  DescriptionComponentRenderer,
  useTable,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { Box, ButtonProps, Flex, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDocumentRBAC } from '../../../../features/DocumentRBAC';
import { useDoc } from '../../../../hooks/useDocument';
import { useDocumentActions } from '../../../../hooks/useDocumentActions';
import { buildValidParams } from '../../../../utils/api';
import { getTranslation } from '../../../../utils/translations';
import {
  DialogOptions,
  DocumentActionButton,
  ModalOptions,
  NotificationOptions,
} from '../../../EditView/components/DocumentActions';

import { PublishAction } from './PublishAction';

import type { BulkActionComponent, ContentManagerPlugin } from '../../../../content-manager';

interface BulkActionDescription {
  dialog?: DialogOptions | NotificationOptions | ModalOptions;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick?: (event: React.SyntheticEvent) => void;
  /**
   * @default 'default'
   */
  type?: 'icon' | 'default';
  /**
   * @default 'secondary'
   */
  variant?: ButtonProps['variant'];
}

/* -------------------------------------------------------------------------------------------------
 * BulkActionsRenderer
 * -----------------------------------------------------------------------------------------------*/

const BulkActionsRenderer = () => {
  const plugins = useStrapiApp('BulkActionsRenderer', (state) => state.plugins);

  const { model, collectionType } = useDoc();
  const { selectedRows } = useTable('BulkActionsRenderer', (state) => state);

  return (
    <Flex gap={2}>
      <DescriptionComponentRenderer
        props={{
          model,
          collectionType,
          documents: selectedRows,
        }}
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getBulkActions()}
      >
        {(actions) => actions.map((action) => <DocumentActionButton key={action.id} {...action} />)}
      </DescriptionComponentRenderer>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DefaultBulkActions
 * -----------------------------------------------------------------------------------------------*/

const DeleteAction: BulkActionComponent = ({ documents, model }) => {
  const { formatMessage } = useIntl();
  const { schema: contentType } = useDoc();
  const selectRow = useTable('DeleteAction', (state) => state.selectRow);
  const hasI18nEnabled = Boolean(contentType?.pluginOptions?.i18n);
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const hasDeletePermission = useDocumentRBAC('deleteAction', (state) => state.canDelete);
  const { deleteMany: bulkDeleteAction } = useDocumentActions();
  const documentIds = documents.map(({ documentId }) => documentId);

  const handleConfirmBulkDelete = async () => {
    const res = await bulkDeleteAction({
      documentIds,
      model,
      params,
    });
    if (!('error' in res)) {
      selectRow([]);
    }
  };

  if (!hasDeletePermission) return null;

  return {
    variant: 'danger-light',
    label: formatMessage({ id: 'global.delete', defaultMessage: 'Delete' }),
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Flex justifyContent="center">
            <WarningCircle width="24px" height="24px" fill="danger600" />
          </Flex>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: 'popUpWarning.bodyMessage.contentType.delete.all',
              defaultMessage: 'Are you sure you want to delete these entries?',
            })}
          </Typography>
          {hasI18nEnabled && (
            <Box textAlign="center" padding={3}>
              <Typography textColor="danger500">
                {formatMessage(
                  {
                    id: getTranslation('Settings.list.actions.deleteAdditionalInfos'),
                    defaultMessage:
                      'This will delete the active locale versions <em>(from Internationalization)</em>',
                  },
                  {
                    em: Emphasis,
                  }
                )}
              </Typography>
            </Box>
          )}
        </Flex>
      ),
      onConfirm: handleConfirmBulkDelete,
    },
  };
};

DeleteAction.type = 'delete';

const UnpublishAction: BulkActionComponent = ({ documents, model }) => {
  const { formatMessage } = useIntl();
  const { schema } = useDoc();
  const selectRow = useTable('UnpublishAction', (state) => state.selectRow);
  const hasPublishPermission = useDocumentRBAC('unpublishAction', (state) => state.canPublish);
  const hasI18nEnabled = Boolean(schema?.pluginOptions?.i18n);
  const hasDraftAndPublishEnabled = Boolean(schema?.options?.draftAndPublish);
  const { unpublishMany: bulkUnpublishAction } = useDocumentActions();
  const documentIds = documents.map(({ documentId }) => documentId);
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  const handleConfirmBulkUnpublish = async () => {
    const data = await bulkUnpublishAction({ documentIds, model, params });
    if (!('error' in data)) {
      selectRow([]);
    }
  };

  const showUnpublishButton =
    hasDraftAndPublishEnabled &&
    hasPublishPermission &&
    documents.some((entry) => entry.status === 'published' || entry.status === 'modified');

  if (!showUnpublishButton) return null;

  return {
    variant: 'tertiary',
    label: formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' }),
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Flex justifyContent="center">
            <WarningCircle width="24px" height="24px" fill="danger600" />
          </Flex>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: 'popUpWarning.bodyMessage.contentType.unpublish.all',
              defaultMessage: 'Are you sure you want to unpublish these entries?',
            })}
          </Typography>
          {hasI18nEnabled && (
            <Box textAlign="center" padding={3}>
              <Typography textColor="danger500">
                {formatMessage(
                  {
                    id: getTranslation('Settings.list.actions.unpublishAdditionalInfos'),
                    defaultMessage:
                      'This will unpublish the active locale versions <em>(from Internationalization)</em>',
                  },
                  {
                    em: Emphasis,
                  }
                )}
              </Typography>
            </Box>
          )}
        </Flex>
      ),
      confirmButton: formatMessage({
        id: 'app.utils.unpublish',
        defaultMessage: 'Unpublish',
      }),
      onConfirm: handleConfirmBulkUnpublish,
    },
  };
};

UnpublishAction.type = 'unpublish';

const Emphasis = (chunks: React.ReactNode) => (
  <Typography fontWeight="semiBold" textColor="danger500">
    {chunks}
  </Typography>
);

const DEFAULT_BULK_ACTIONS: BulkActionComponent[] = [PublishAction, UnpublishAction, DeleteAction];

export { DEFAULT_BULK_ACTIONS, BulkActionsRenderer, Emphasis };
export type { BulkActionDescription };
