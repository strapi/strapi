import * as React from 'react';

import {
  Box,
  Button,
  Typography,
  ModalBody,
  ModalFooter,
  Tr,
  Td,
  IconButton,
  Flex,
  Icon,
  Tooltip,
  Loader,
} from '@strapi/design-system';
import {
  useTableContext,
  Table as HelperPluginTable,
  getYupInnerErrors,
  useFetchClient,
  useNotification,
  TranslationMessage,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { Entity } from '@strapi/types';
import { AxiosError, AxiosResponse } from 'axios';
import { MessageDescriptor, useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { Link, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ValidationError } from 'yup';

import { useTypedSelector } from '../../../../../core/store/hooks';
import { getTranslation } from '../../../../utils/translations';
import { createYupSchema } from '../../../../utils/validation';
import { useAllowedActions } from '../../hooks/useAllowedActions';
import { Table } from '../Table';

import { ConfirmDialogPublishAll } from './ConfirmBulkActionDialog';

import type { BulkActionComponent } from '../../../../../core/apis/content-manager';

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

interface EntryValidationTextProps {
  validationErrors?: Record<string, MessageDescriptor>;
  isPublished?: boolean;
}

const EntryValidationText = ({
  validationErrors,
  isPublished = false,
}: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  if (validationErrors) {
    const validationErrorsMessages = Object.entries(validationErrors)
      .map(([key, value]) =>
        formatMessage(
          { id: `${value.id}.withField`, defaultMessage: value.defaultMessage },
          { field: key }
        )
      )
      .join(' ');

    return (
      <Flex gap={2}>
        <Icon color="danger600" as={CrossCircle} />
        <Tooltip description={validationErrorsMessages}>
          <TypographyMaxWidth textColor="danger600" variant="omega" fontWeight="semiBold" ellipsis>
            {validationErrorsMessages}
          </TypographyMaxWidth>
        </Tooltip>
      </Flex>
    );
  }

  if (isPublished) {
    return (
      <Flex gap={2}>
        <Icon color="success600" as={CheckCircle} />
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'content-manager.bulk-publish.already-published',
            defaultMessage: 'Already Published',
          })}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <Icon color="success600" as={CheckCircle} />
      <Typography>
        {formatMessage({
          id: 'app.utils.ready-to-publish',
          defaultMessage: 'Ready to publish',
        })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesTableContentProps {
  isPublishing?: boolean;
  rowsToDisplay?: TableRow[];
  entriesToPublish?: Entity.ID[];
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
}

const SelectedEntriesTableContent = ({
  isPublishing,
  rowsToDisplay = [],
  entriesToPublish = [],
  validationErrors = {},
}: SelectedEntriesTableContentProps) => {
  const {
    location: { pathname },
  } = useHistory();
  const { formatMessage } = useIntl();

  const contentTypeSettings = useTypedSelector(
    (state) => state['content-manager_listView'].contentType?.settings
  );
  const mainField = contentTypeSettings?.mainField;
  const shouldDisplayMainField = mainField != null && mainField !== 'id';

  return (
    <HelperPluginTable.Content>
      <HelperPluginTable.Head>
        <HelperPluginTable.HeaderCheckboxCell />
        <HelperPluginTable.HeaderCell fieldSchemaType="integer" label="id" name="id" />
        {shouldDisplayMainField && (
          <HelperPluginTable.HeaderCell fieldSchemaType="string" label="name" name="name" />
        )}
        <HelperPluginTable.HeaderCell fieldSchemaType="string" label="status" name="status" />
      </HelperPluginTable.Head>
      <HelperPluginTable.LoadingBody />
      <HelperPluginTable.Body>
        {rowsToDisplay.map((row, index) => (
          <Tr key={row.id}>
            <Td>
              <Table.CheckboxDataCell rowId={row.id} index={index} />
            </Td>
            <Td>
              <Typography>{row.id}</Typography>
            </Td>
            {shouldDisplayMainField && (
              <Td>
                <Typography>{row[mainField as keyof TableRow]}</Typography>
              </Td>
            )}
            <Td>
              {isPublishing && entriesToPublish.includes(row.id) ? (
                <Flex gap={2}>
                  <Typography>
                    {formatMessage({
                      id: 'content-manager.success.record.publishing',
                      defaultMessage: 'Publishing...',
                    })}
                  </Typography>
                  <Loader small />
                </Flex>
              ) : (
                <EntryValidationText
                  validationErrors={validationErrors[row.id]}
                  isPublished={row.publishedAt !== null}
                />
              )}
            </Td>
            <Td>
              <IconButton
                forwardedAs={Link}
                // @ts-expect-error – DS does not correctly infer props from the as prop.
                to={{
                  pathname: `${pathname}/${row.id}`,
                  state: { from: pathname },
                }}
                label={formatMessage(
                  { id: 'app.component.HelperPluginTable.edit', defaultMessage: 'Edit {target}' },
                  {
                    target: formatMessage(
                      {
                        id: 'content-manager.components.ListViewHelperPluginTable.row-line',
                        defaultMessage: 'item line {number}',
                      },
                      { number: index + 1 }
                    ),
                  }
                )}
                noBorder
                target="_blank"
                marginLeft="auto"
              >
                <Pencil />
              </IconButton>
            </Td>
          </Tr>
        ))}
      </HelperPluginTable.Body>
    </HelperPluginTable.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesModalContentProps {
  setSelectedListViewEntries: React.Dispatch<React.SetStateAction<Entity.ID[]>>;
  onClose: () => void;
}

interface TableRow {
  id: Entity.ID;
  publishedAt: string | null;
}

const SelectedEntriesModalContent = ({
  setSelectedListViewEntries,
  onClose,
}: SelectedEntriesModalContentProps) => {
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, onSelectRow, isLoading, isFetching } = useTableContext<TableRow>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [rowsToDisplay, setRowsToDisplay] = React.useState<Array<TableRow>>([]);
  const [publishedCount, setPublishedCount] = React.useState(0);
  const { formatAPIError } = useAPIErrorHandler();

  const { contentType, components } = useTypedSelector(
    (state) => state['content-manager_listView']
  );

  const validationErrors = React.useMemo(() => {
    if (rows.length === 0 || !contentType) return {};

    const schema = createYupSchema(
      contentType,
      { components },
      { isDraft: false, isJSONTestDisabled: true }
    );
    const validationErrors: Record<Entity.ID, Record<string, TranslationMessage>> = rows.reduce(
      (acc: any, entry) => {
        try {
          schema.validateSync(entry, { abortEarly: false });
          return acc;
        } catch (e) {
          if (e instanceof ValidationError) {
            return {
              ...acc,
              [entry.id]: getYupInnerErrors(e),
            };
          }
        }
      },
      {} as Record<Entity.ID, Record<string, TranslationMessage>>
    );

    return validationErrors;
  }, [components, contentType, rows]);

  const entriesToPublish = rows
    .filter(({ id }) => selectedEntries.includes(id) && !validationErrors[id])
    .map(({ id }) => id);

  const { post } = useFetchClient();
  const toggleNotification = useNotification();

  const selectedEntriesWithErrorsCount = rowsToDisplay.filter(
    ({ id }) => selectedEntries.includes(id) && validationErrors[id]
  ).length;
  const selectedEntriesPublished = rowsToDisplay.filter(
    ({ id, publishedAt }) => selectedEntries.includes(id) && publishedAt
  ).length;
  const selectedEntriesWithNoErrorsCount =
    selectedEntries.length - selectedEntriesWithErrorsCount - selectedEntriesPublished;

  const bulkPublishMutation = useMutation<
    AxiosResponse<Contracts.CollectionTypes.BulkPublish.Response>,
    AxiosError<Required<Pick<Contracts.CollectionTypes.BulkPublish.Response, 'error'>>>,
    Contracts.CollectionTypes.BulkPublish.Request['body']
  >(
    (data) =>
      post(`/content-manager/collection-types/${contentType!.uid}/actions/bulkPublish`, data),
    {
      onSuccess() {
        refetchList();

        const update = rowsToDisplay.filter((row) => {
          if (entriesToPublish.includes(row.id)) {
            // Deselect the entries that have been published from the modal table
            onSelectRow({ name: row.id, value: false });
          }

          // Remove the entries that have been published from the table
          return !entriesToPublish.includes(row.id);
        });

        setRowsToDisplay(update);
        const publishedIds = update.map(({ id }) => id);
        // Deselect the entries that were published in the list view
        setSelectedListViewEntries(publishedIds);

        toggleNotification({
          type: 'success',
          message: { id: 'content-manager.success.record.publish', defaultMessage: 'Published' },
        });
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const handleConfirmBulkPublish = async () => {
    toggleDialog();
    const { data } = await bulkPublishMutation.mutateAsync({ ids: entriesToPublish });
    setPublishedCount(data.count);
  };

  const getFormattedCountMessage = () => {
    if (publishedCount) {
      return formatMessage(
        {
          id: getTranslation('containers.ListPage.selectedEntriesModal.publishedCount'),
          defaultMessage:
            '<b>{publishedCount}</b> {publishedCount, plural, =0 {entries} one {entry} other {entries}} published. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
        },
        {
          publishedCount,
          withErrorsCount: selectedEntriesWithErrorsCount,
          b: BoldChunk,
        }
      );
    }

    return formatMessage(
      {
        id: getTranslation('containers.ListPage.selectedEntriesModal.selectedCount'),
        defaultMessage:
          '<b>{alreadyPublishedCount}</b> {alreadyPublishedCount, plural, =0 {entries} one {entry} other {entries}} already published. <b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
      },
      {
        readyToPublishCount: selectedEntriesWithNoErrorsCount,
        withErrorsCount: selectedEntriesWithErrorsCount,
        alreadyPublishedCount: selectedEntriesPublished,
        b: BoldChunk,
      }
    );
  };

  const refetchList = () => {
    queryClient.invalidateQueries(['content-manager', 'collection-types', contentType?.uid]);
  };

  React.useEffect(() => {
    // When the api responds with data
    if (rows.length > 0) {
      // Update the rows to display
      setRowsToDisplay(rows);
    }
  }, [rows]);

  return (
    <>
      <ModalBody>
        <Typography>{getFormattedCountMessage()}</Typography>
        <Box marginTop={5}>
          <SelectedEntriesTableContent
            isPublishing={bulkPublishMutation.isLoading}
            rowsToDisplay={rowsToDisplay}
            entriesToPublish={entriesToPublish}
            validationErrors={validationErrors}
          />
        </Box>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          <Flex gap={2}>
            <Button onClick={refetchList} variant="tertiary" loading={isFetching}>
              {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
            </Button>
            <Button
              onClick={toggleDialog}
              disabled={
                selectedEntries.length === 0 ||
                selectedEntries.length === selectedEntriesWithErrorsCount ||
                isLoading
              }
              loading={bulkPublishMutation.isLoading}
            >
              {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
            </Button>
          </Flex>
        }
      />
      <ConfirmDialogPublishAll
        isOpen={isDialogOpen}
        onToggleDialog={toggleDialog}
        isConfirmButtonLoading={bulkPublishMutation.isLoading}
        onConfirm={handleConfirmBulkPublish}
      />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PublishAction
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: BulkActionComponent = ({ model: slug }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, setSelectedEntries, rows } = useTableContext();
  const selectedEntriesObjects = rows.filter((entry) => selectedEntries.includes(entry.id));
  const hasPublishPermission = useAllowedActions(slug).canPublish;
  const showPublishButton =
    // @ts-expect-error - rows has the complete object, not only ID, type is wrong
    hasPublishPermission && selectedEntriesObjects.some((entry) => !entry.publishedAt);

  if (!showPublishButton) return null;

  return {
    actionType: 'publish',
    variant: 'tertiary',
    label: formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' }),
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: getTranslation('containers.ListPage.selectedEntriesModal.title'),
        defaultMessage: 'Publish entries',
      }),
      content: ({ onClose }) => {
        return (
          <HelperPluginTable.Root
            rows={selectedEntriesObjects}
            defaultSelectedEntries={selectedEntries}
            colCount={4}
          >
            <SelectedEntriesModalContent
              setSelectedListViewEntries={setSelectedEntries}
              onClose={onClose}
            />
          </HelperPluginTable.Root>
        );
      },
    },
  };
};

export { PublishAction, SelectedEntriesModalContent };
