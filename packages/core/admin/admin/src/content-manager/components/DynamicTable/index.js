import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { DynamicTable as Table, useStrapiApp } from '@strapi/helper-plugin';
import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import TableRows from './TableRows';

const DynamicTable = ({ canDelete, contentTypeName, isLoading, layout, rows }) => {
  const { runHookWaterfall } = useStrapiApp();

  const tableHeaders = useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, {
      displayedHeaders: layout.contentType.layouts.list,
      layout,
    });

    return headers.displayedHeaders;
  }, [runHookWaterfall, layout]);

  return (
    <Table
      contentType={contentTypeName}
      isLoading={isLoading}
      headers={tableHeaders}
      // rows={data}
      rows={rows}
      withBulkActions
      withMainAction={canDelete}
    >
      <TableRows
        canDelete={canDelete}
        headers={tableHeaders}
        rows={rows}
        withBulkActions
        withMainAction={canDelete}
      />
    </Table>
  );
};

DynamicTable.propTypes = {
  canDelete: PropTypes.bool.isRequired,
  contentTypeName: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      info: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
        editRelations: PropTypes.array,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
  rows: PropTypes.array.isRequired,
};

export default DynamicTable;
