import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { DynamicTable } from '@strapi/helper-plugin';

import { AssetDefinition } from '../../constants';
import { tableHeaders } from './utils/tableHeaders';
import { TableRows } from './TableRows';

export const AssetTableList = ({ assets }) => {
  const { formatMessage } = useIntl();

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  return (
    <DynamicTable contentType="assets" headers={headers} rows={assets}>
      <TableRows assets={assets} />
    </DynamicTable>
  );
};

AssetTableList.propTypes = {
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
};
