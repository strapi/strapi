import * as React from 'react';

import {
  Button,
  Flex,
  Dialog,
  DialogBody,
  DialogFooter,
  Typography,
  DialogFooterProps,
} from '@strapi/design-system';
import {
  useTableContext,
  useFetchClient,
  useNotification,
  useAPIErrorHandler,
  useQueryParams,
} from '@strapi/helper-plugin';
import { Check, ExclamationMarkCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import { useTypedSelector } from '../../../../../core/store/hooks';
import { getTranslation } from '../../../../utils/translations';

import { Emphasis } from './Actions';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { AxiosError } from 'axios';

interface ConfirmBulkActionDialogProps extends Pick<DialogFooterProps, 'endAction'> {
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
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      })}
      isOpen={isOpen}
    >
      <DialogBody icon={<ExclamationMarkCircle />}>
        <Flex direction="column" alignItems="stretch" gap={2}>
          {dialogBody}
        </Flex>
      </DialogBody>
      <DialogFooter
        startAction={
          <Button onClick={onToggleDialog} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endAction={endAction}
      />
    </Dialog>
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
  const { get } = useFetchClient();
  const { selectedEntries } = useTableContext();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const contentType = useTypedSelector((state) => state['content-manager_listView'].contentType);
  const [{ query }] = useQueryParams<{
    plugins?: {
      i18n?: {
        locale?: string;
      };
    };
  }>();

  const slug = contentType?.uid ?? '';
  const hasI18nEnabled = Boolean(contentType?.pluginOptions?.i18n);

  const {
    data: countDraftRelations = 0,
    isLoading,
    isError,
  } = useQuery<
    Contracts.CollectionTypes.CountManyEntriesDraftRelations.Response['data'],
    AxiosError<
      Required<Pick<Contracts.CollectionTypes.CountManyEntriesDraftRelations.Response, 'error'>>
    >
  >(
    ['content-manager', 'draft-relations', slug, selectedEntries],
    async () => {
      const {
        data: { data },
      } = await get<Contracts.CollectionTypes.CountManyEntriesDraftRelations.Response>(
        `/content-manager/collection-types/${slug}/actions/countManyEntriesDraftRelations`,
        {
          params: {
            ids: selectedEntries,
            locale: query?.plugins?.i18n?.locale,
          },
        }
      );

      return data;
    },
    {
      // The API is called everytime you select/deselect an entry, this check avoids us sending a query with bad data
      enabled: selectedEntries.length > 0,
      onError(error) {
        toggleNotification({ type: 'warning', message: formatAPIError(error) });
      },
    }
  );

  if (isError) {
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
          {hasI18nEnabled && (
            <Typography textColor="danger500">
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
