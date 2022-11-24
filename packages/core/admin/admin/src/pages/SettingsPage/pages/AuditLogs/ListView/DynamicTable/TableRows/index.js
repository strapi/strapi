import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { IconButton } from '@strapi/design-system/IconButton';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import Eye from '@strapi/icons/Eye';
import { onRowClick, stopPropagation } from '@strapi/helper-plugin';
import useFormatTimeStamp from '../../utils/useFormatTimeStamp';

const FormatTimeStamp = ({ value }) => {
  return useFormatTimeStamp(value);
};

const TableRows = ({ headers, rows, onModalToggle }) => {
  const { formatMessage } = useIntl();

  return (
    <Tbody>
      {rows.map((data) => {
        return (
          <Tr
            key={data.id}
            {...onRowClick({
              fn: () => onModalToggle(data.id),
            })}
          >
            {headers.map(({ key, name }) => {
              return (
                <Td key={key}>
                  <Typography textColor="neutral800">
                    {key === 'date' ? <FormatTimeStamp value={data[name]} /> : data[name] || '-'}
                  </Typography>
                </Td>
              );
            })}

            <Td {...stopPropagation}>
              <Flex justifyContent="end">
                <IconButton
                  onClick={() => onModalToggle(data.id)}
                  label={formatMessage(
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
  onModalToggle: PropTypes.func.isRequired,
};

export default TableRows;
