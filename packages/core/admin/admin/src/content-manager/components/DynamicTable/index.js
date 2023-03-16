import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { DynamicTable as Table, useStrapiApp } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import { selectDisplayedHeaders } from '../../pages/ListView/selectors';
import { getTrad } from '../../utils';
import TableRows from './TableRows';
import ConfirmDialogDeleteAll from './ConfirmDialogDeleteAll';
import ConfirmDialogDelete from './ConfirmDialogDelete';
import { PublicationState } from './CellContent/PublicationState/PublicationState';
import { ReviewWorkflowsStage } from './CellContent/ReviewWorkflowsStage';

const DynamicTable = ({
  canCreate,
  canDelete,
  contentTypeName,
  action,
  isBulkable,
  isLoading,
  onConfirmDelete,
  onConfirmDeleteAll,
  layout,
  rows,
}) => {
  const { runHookWaterfall } = useStrapiApp();
  const hasDraftAndPublish = layout.contentType.options?.draftAndPublish ?? false;
  const hasReviewWorkflows = layout.contentType.options?.reviewWorkflows ?? false;
  const { formatMessage } = useIntl();
  const displayedHeaders = useSelector(selectDisplayedHeaders);

  const tableHeaders = useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, {
      displayedHeaders,
      layout,
    });

    const formattedHeaders = headers.displayedHeaders.map((header) => {
      const { fieldSchema, metadatas, name } = header;

      return {
        ...header,
        metadatas: {
          ...metadatas,
          label: formatMessage({
            id: getTrad(`containers.ListPage.table-headers.${name}`),
            defaultMessage: metadatas.label,
          }),
        },
        name: fieldSchema.type === 'relation' ? `${name}.${metadatas.mainField.name}` : name,
      };
    });

    if (hasDraftAndPublish) {
      formattedHeaders.push({
        key: '__published_at_temp_key__',
        name: 'publishedAt',
        fieldSchema: {
          type: 'custom',
        },
        metadatas: {
          label: formatMessage({
            id: getTrad(`containers.ListPage.table-headers.publishedAt`),
            defaultMessage: 'publishedAt',
          }),
          searchable: false,
          sortable: true,
        },
        cellFormatter({ publishedAt }) {
          return <PublicationState isPublished={!!publishedAt} />;
        },
      });
    }

    if (hasReviewWorkflows) {
      formattedHeaders.push({
        key: '__strapi_reviewWorkflows_stage_temp_key__',
        name: 'strapi_reviewWorkflows_stage',
        fieldSchema: {
          type: 'custom',
        },
        metadatas: {
          label: formatMessage({
            id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.stage`),
            defaultMessage: 'Review stage',
          }),
          searchable: false,
          sortable: false,
        },
        cellFormatter({ strapi_reviewWorkflows_stage }) {
          return <ReviewWorkflowsStage name={strapi_reviewWorkflows_stage.name} />;
        },
      });
    }

    return formattedHeaders;
  }, [
    runHookWaterfall,
    displayedHeaders,
    layout,
    hasDraftAndPublish,
    hasReviewWorkflows,
    formatMessage,
  ]);

  return (
    <Table
      components={{ ConfirmDialogDelete, ConfirmDialogDeleteAll }}
      contentType={contentTypeName}
      action={action}
      isLoading={isLoading}
      headers={tableHeaders}
      onConfirmDelete={onConfirmDelete}
      onConfirmDeleteAll={onConfirmDeleteAll}
      onOpenDeleteAllModalTrackedEvent="willBulkDeleteEntries"
      rows={rows}
      withBulkActions
      withMainAction={canDelete && isBulkable}
    >
      <TableRows
        canCreate={canCreate}
        canDelete={canDelete}
        contentType={layout.contentType}
        headers={tableHeaders}
        rows={rows}
        withBulkActions
        withMainAction={canDelete && isBulkable}
      />
    </Table>
  );
};

DynamicTable.defaultProps = {
  action: undefined,
};

DynamicTable.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  contentTypeName: PropTypes.string.isRequired,
  action: PropTypes.node,
  isBulkable: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
  onConfirmDeleteAll: PropTypes.func.isRequired,
  rows: PropTypes.array.isRequired,
};

export default DynamicTable;
