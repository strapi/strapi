import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Table, useStrapiApp } from '@strapi/helper-plugin';

import { useSelector } from 'react-redux';

import getReviewWorkflowsColumn from 'ee_else_ce/content-manager/components/ListViewTable/CellContent/ReviewWorkflowsStage/getTableColumn';
import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import { selectDisplayedHeaders } from '../../pages/ListView/selectors';
import { getTrad } from '../../utils';
import { Body } from './Body';
import { PublicationState } from './CellContent/PublicationState/PublicationState';
import BulkActionButtons from './BulkActionButtons';
import CellContent from './CellContent';

const ListViewTable = ({
  canCreate,
  canDelete,
  canPublish,
  contentTypeName,
  action,
  withEntityActions,
  isLoading,
  onConfirmDelete,
  onConfirmDeleteAll,
  onConfirmPublishAll,
  onConfirmUnpublishAll,
  layout,
  rows,
}) => {
  const [isConfirmDeleteRowOpen, setIsConfirmDeleteRowOpen] = React.useState(false);

  const { runHookWaterfall } = useStrapiApp();
  const hasDraftAndPublish = layout.contentType.options?.draftAndPublish ?? false;
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
      });
    }

    // this should not exist. Ideally we would use registerHook() similar to what has been done
    // in the i18n plugin. In order to do that review-workflows should have been a plugin. In
    // a future iteration we need to find a better pattern.

    // In CE this will return null - in EE a column definition including the custom formatting component.
    const reviewWorkflowColumn = getReviewWorkflowsColumn(layout);

    if (reviewWorkflowColumn) {
      formattedHeaders.push(reviewWorkflowColumn);
    }

    return formattedHeaders;
  }, [runHookWaterfall, displayedHeaders, layout, hasDraftAndPublish, formatMessage]);

  // Add 1 column for the checkbox and 1 for the actions
  const colCount = tableHeaders.length + 2;

  return (
    <Table.Root rows={rows} isLoading={isLoading} colCount={colCount}>
      <Table.ActionBar>
        <BulkActionButtons
          showPublish={canPublish && hasDraftAndPublish}
          showDelete={canDelete}
          onConfirmDeleteAll={onConfirmDeleteAll}
          onConfirmPublishAll={onConfirmPublishAll}
          onConfirmUnpublishAll={onConfirmUnpublishAll}
        />
      </Table.ActionBar>
      <Table.Content>
        <Table.Head>
          {/* Bulk action select all checkbox */}
          <Table.HeaderCheckboxCell />
          {/* Dynamic headers based on fields */}
          {tableHeaders.map(({ fieldSchema, key, name, metadatas }) => (
            <Table.HeaderCell
              key={key}
              name={name}
              fieldSchemaType={fieldSchema.type}
              relationFieldName={metadatas.mainField?.name}
              isSortable={metadatas.sortable}
              label={metadatas.label}
            />
          ))}
          {/* Visually hidden header for actions */}
          <Table.HeaderHiddenActionsCell />
        </Table.Head>
        {/* Loading content */}
        <Table.LoadingBody />
        {/* Empty content */}
        <Table.EmptyBody contentType={contentTypeName} aciton={action} />
        {/* Content */}
        <Body.Root
          onConfirmDelete={onConfirmDelete}
          isConfirmDeleteRowOpen={isConfirmDeleteRowOpen}
          setIsConfirmDeleteRowOpen={setIsConfirmDeleteRowOpen}
        >
          {rows.map((rowData, index) => {
            return (
              <Body.Row key={rowData.id} rowId={rowData.id}>
                {/* Bulk action row checkbox */}
                <Body.CheckboxDataCell rowId={rowData.id} index={index} />
                {/* Field data */}
                {tableHeaders.map(({ key, name, ...rest }) => {
                  if (name === 'publishedAt') {
                    return (
                      <Body.DataCell key={key}>
                        <PublicationState isPublished={Boolean(rowData.publishedAt)} />
                      </Body.DataCell>
                    );
                  }

                  return (
                    <Body.DataCell key={key}>
                      <CellContent
                        content={rowData[name.split('.')[0]]}
                        name={name}
                        contentType={layout.contentType}
                        {...rest}
                        rowId={rowData.id}
                      />
                    </Body.DataCell>
                  );
                })}
                {/* Actions: edit, duplicate, delete */}
                {withEntityActions && (
                  <Body.EntityActionsDataCell
                    rowId={rowData.id}
                    index={index}
                    setIsConfirmDeleteRowOpen={setIsConfirmDeleteRowOpen}
                    canCreate={canCreate}
                    canDelete={canDelete}
                  />
                )}
              </Body.Row>
            );
          })}
        </Body.Root>
      </Table.Content>
    </Table.Root>
  );
};

ListViewTable.defaultProps = {
  action: undefined,
};

ListViewTable.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canPublish: PropTypes.bool.isRequired,
  contentTypeName: PropTypes.string.isRequired,
  action: PropTypes.node,
  withEntityActions: PropTypes.bool.isRequired,
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
  onConfirmPublishAll: PropTypes.func.isRequired,
  onConfirmUnpublishAll: PropTypes.func.isRequired,
  rows: PropTypes.array.isRequired,
};

export default ListViewTable;
