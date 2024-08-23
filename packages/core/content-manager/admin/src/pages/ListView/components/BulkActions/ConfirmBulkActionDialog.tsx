import * as React from 'react';

import {
  useTable,
  useNotification,
  useAPIErrorHandler,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { Button, Flex, Dialog, Typography } from '@strapi/design-system';
import { Check, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDoc } from '../../../../hooks/useDocument';
import { useGetManyDraftRelationCountQuery } from '../../../../services/documents';
import { getTranslation } from '../../../../utils/translations';

import { Emphasis } from './Actions';

interface ConfirmBulkActionDialogProps {
  endAction: React.ReactNode;
  onToggleDialog: () => void;
  isOpen?: boolean;
  dialogBody: React.ReactNode;
}

const ConfirmBulkActionDialog = ({
  onToggleDialog,
  isOpen = false,
  dialogBody,
  endAction,
}: ConfirmBulkActionDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Content>
        <Dialog.Header>
          {formatMessage({
            id: 'app.components.ConfirmDialog.title',
            defaultMessage: 'Confirmation',
          })}
        </Dialog.Header>
        <Dialog.Body>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Flex justifyContent="center">
              <WarningCircle width="24px" height="24px" fill="danger600" />
            </Flex>
            {dialogBody}
          </Flex>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button fullWidth onClick={onToggleDialog} variant="tertiary">
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          </Dialog.Cancel>
          {endAction}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialogPublishAll
 * -----------------------------------------------------------------------------------------------*/

interface ConfirmDialogPublishAllProps
  extends Pick<ConfirmBulkActionDialogProps, 'isOpen' | 'onToggleDialog'> {
  isConfirmButtonLoading?: boolean;
  onConfirm: () => void;
}

const ConfirmDialogPublishAll = ({
  isOpen,
  onToggleDialog,
  isConfirmButtonLoading = false,
  onConfirm,
}: ConfirmDialogPublishAllProps) => {
  const { formatMessage } = useIntl();
  const selectedEntries = useTable('ConfirmDialogPublishAll', (state) => state.selectedRows);
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler(getTranslation);
  const { model, schema } = useDoc();
  const [{ query }] = useQueryParams<{
    plugins?: {
      i18n?: {
        locale?: string;
      };
    };
  }>();

  // TODO skipping this for now as there is a bug with the draft relation count that will be worked on separately
  // see RFC "Count draft relations" in Notion
  const enableDraftRelationsCount = false;

  const {
    data: countDraftRelations = 0,
    isLoading,
    error,
  } = useGetManyDraftRelationCountQuery(
    {
      model,
      documentIds: selectedEntries.map((entry) => entry.documentId),
      locale: query?.plugins?.i18n?.locale,
    },
    {
      skip: !enableDraftRelationsCount || selectedEntries.length === 0,
    }
  );

  React.useEffect(() => {
    if (error) {
      toggleNotification({ type: 'danger', message: formatAPIError(error) });
    }
  }, [error, formatAPIError, toggleNotification]);

  if (error) {
    return null;
  }

  return (
    <ConfirmBulkActionDialog
      isOpen={isOpen && !isLoading}
      onToggleDialog={onToggleDialog}
      dialogBody={
        <>
          <Typography id="confirm-description" textAlign="center">
            {countDraftRelations > 0 &&
              formatMessage(
                {
                  id: getTranslation(`popUpwarning.warning.bulk-has-draft-relations.message`),
                  defaultMessage:
                    '<b>{count} {count, plural, one { relation } other { relations } } out of {entities} { entities, plural, one { entry } other { entries } } {count, plural, one { is } other { are } }</b> not published yet and might lead to unexpected behavior. ',
                },
                {
                  b: BoldChunk,
                  count: countDraftRelations,
                  entities: selectedEntries.length,
                }
              )}
            {formatMessage({
              id: getTranslation('popUpWarning.bodyMessage.contentType.publish.all'),
              defaultMessage: 'Are you sure you want to publish these entries?',
            })}
          </Typography>
          {schema?.pluginOptions &&
            'i18n' in schema.pluginOptions &&
            schema?.pluginOptions.i18n && (
              <Typography textColor="danger500" textAlign="center">
                {formatMessage(
                  {
                    id: getTranslation('Settings.list.actions.publishAdditionalInfos'),
                    defaultMessage:
                      'This will publish the active locale versions <em>(from Internationalization)</em>',
                  },
                  {
                    em: Emphasis,
                  }
                )}
              </Typography>
            )}
        </>
      }
      endAction={
        <Button
          onClick={onConfirm}
          variant="secondary"
          startIcon={<Check />}
          loading={isConfirmButtonLoading}
        >
          {formatMessage({
            id: 'app.utils.publish',
            defaultMessage: 'Publish',
          })}
        </Button>
      }
    />
  );
};

export { ConfirmDialogPublishAll, ConfirmBulkActionDialog };
export type { ConfirmDialogPublishAllProps, ConfirmBulkActionDialogProps };
