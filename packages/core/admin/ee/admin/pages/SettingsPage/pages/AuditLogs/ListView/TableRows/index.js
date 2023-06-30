import React from 'react';

import { Flex, IconButton, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { Eye } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import useFormatTimeStamp from '../hooks/useFormatTimeStamp';
import { getDefaultMessage } from '../utils/getActionTypesDefaultMessages';

const TableRows = ({ headers, rows, onOpenModal }) => {
  const { formatMessage } = useIntl();
  const formatTimeStamp = useFormatTimeStamp();

  const getCellValue = ({ type, value, model }) => {
    if (type === 'date') {
      return formatTimeStamp(value);
    }

    if (type === 'action') {
      return formatMessage(
        {
          id: `Settings.permissions.auditLogs.${value}`,
          defaultMessage: getDefaultMessage(value),
        },
        { model }
      );
    }

    return value || '-';
  };

  return (
    <Tbody>
      {rows.map((data) => {
        return (
          <Tr
            key={data.id}
            {...onRowClick({
              fn: () => onOpenModal(data.id),
            })}
          >
            {headers.map(({ key, name, cellFormatter }) => {
              return (
                <Td key={key}>
                  <Typography textColor="neutral800">
                    {getCellValue({
                      type: key,
                      value: cellFormatter ? cellFormatter(data[name]) : data[name],
                      model: data.payload?.model,
                    })}
                  </Typography>
                </Td>
              );
            })}
            <Td {...stopPropagation}>
              <Flex justifyContent="end">
                <IconButton
                  onClick={() => onOpenModal(data.id)}
                  aria-label={formatMessage(
                    { id: 'app.component.table.view', defaultMessage: '{target} details' },
                    { target: `${data.action} action` }
                  )}
                  noBorder
                  icon={<Eye />}
                />
              </Flex>
            </Td>
          </Tr>
        );
      })}
    </Tbody>
  );
};

TableRows.defaultProps = {
  rows: [],
};

TableRows.propTypes = {
  headers: PropTypes.array.isRequired,
  rows: PropTypes.array,
  onOpenModal: PropTypes.func.isRequired,
};

export default TableRows;
