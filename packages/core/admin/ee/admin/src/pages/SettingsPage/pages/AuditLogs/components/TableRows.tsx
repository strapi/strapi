import React from 'react';

import { Flex, IconButton, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { Eye } from '@strapi/icons';
import { Attribute, Entity } from '@strapi/types';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { ListLayoutRow } from '../../../../../../../../admin/src/content-manager/utils/layouts';
import { AuditLog } from '../../../../../../../../shared/contracts/audit-logs';
import { useFormatTimeStamp } from '../hooks/useFormatTimeStamp';
import { getDefaultMessage } from '../utils/getActionTypesDefaultMessages';

export interface TableHeader extends Omit<ListLayoutRow, 'metadatas' | 'fieldSchema' | 'name'> {
  metadatas: Omit<ListLayoutRow['metadatas'], 'label'> & {
    label: string;
  };
  name: keyof AuditLog;
  fieldSchema?: Attribute.Any | { type: 'custom' };
  cellFormatter?: (data?: AuditLog[keyof AuditLog]) => React.ReactNode;
}

type TableRowsProps = {
  headers: TableHeader[];
  rows: AuditLog[];
  onOpenModal: (id: Entity.ID) => void;
};

export const TableRows = ({ headers, rows, onOpenModal }: TableRowsProps) => {
  const { formatMessage } = useIntl();
  const formatTimeStamp = useFormatTimeStamp();

  // Not sure that 'value' can be typed properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCellValue = ({ type, value, model }: { type: string; value: any; model: unknown }) => {
    if (type === 'date') {
      return formatTimeStamp(value);
    }

    if (type === 'action') {
      return formatMessage(
        {
          id: `Settings.permissions.auditLogs.${value}`,
          defaultMessage: getDefaultMessage(value),
        },
        // @ts-expect-error - Model
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
            {headers?.map(({ key, name, cellFormatter }) => {
              const rowValue = data[name];

              return (
                <Td key={key}>
                  <Typography textColor="neutral800">
                    {getCellValue({
                      type: key,
                      value: cellFormatter ? cellFormatter(rowValue) : rowValue,
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
