import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Row, Button, Table as TableCompo, Subtitle } from '@strapi/parts';
import { EmptyBodyTable, useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { DeleteIcon } from '@strapi/icons';
import styled from 'styled-components';
import TableHead from './TableHead';
import TableRows from './TableRows';

const BlockActions = styled(Row)`
  & > * + * {
    margin-left: ${({ theme }) => theme.spaces[2]};
  }

  margin-left: ${({ pullRight }) => (pullRight ? 'auto' : undefined)};
`;

const Table = ({ canDelete, canUpdate, headers, rows, withBulkActions, withMainAction }) => {
  const [entriesToDelete, setEntriesToDelete] = useState([]);
  const [{ query }] = useQueryParams();
  const { formatMessage } = useIntl();
  const ROW_COUNT = rows.length + 1;
  const COL_COUNT = headers.length + (withBulkActions ? 1 : 0) + (withMainAction ? 1 : 0);
  const hasFilters = query.filters !== undefined;
  const areAllEntriesSelected = entriesToDelete.length === rows.length && rows.length > 0;

  const content = hasFilters
    ? {
        id: 'content-manager.components.TableEmpty.withFilters',
        defaultMessage: 'There are no {contentType} with the applied filters...',
        values: { contentType: 'Users' },
      }
    : undefined;

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      setEntriesToDelete(rows.map(row => row.id));
    } else {
      setEntriesToDelete([]);
    }
  };

  const handleSelectRow = ({ name, value }) => {
    setEntriesToDelete(prev => {
      if (value) {
        return prev.concat(name);
      }

      return prev.filter(id => id !== name);
    });
  };

  return (
    <>
      {entriesToDelete.length > 0 && (
        <Box>
          <Box paddingBottom={4}>
            <Row justifyContent="space-between">
              <BlockActions>
                <Subtitle textColor="neutral600">
                  {/* FIXME: create a common translation */}
                  {formatMessage(
                    {
                      id: 'Settings.webhooks.to.delete',
                      defaultMessage:
                        '{webhooksToDeleteLength, plural, one {# asset} other {# assets}} selected',
                    },
                    { webhooksToDeleteLength: entriesToDelete.length }
                  )}
                </Subtitle>
                <Button
                  // onClick={() => handleDeleteClick('all')}
                  startIcon={<DeleteIcon />}
                  size="L"
                  variant="danger-light"
                >
                  Delete
                </Button>
              </BlockActions>
            </Row>
          </Box>
        </Box>
      )}
      <TableCompo colCount={COL_COUNT} rowCount={ROW_COUNT}>
        <TableHead
          areAllEntriesSelected={areAllEntriesSelected}
          entriesToDelete={entriesToDelete}
          headers={headers}
          onSelectAll={handleSelectAll}
          withMainAction={withMainAction}
          withBulkActions={withBulkActions}
        />
        {!rows.length ? (
          <EmptyBodyTable colSpan={COL_COUNT} content={content} />
        ) : (
          <TableRows
            canDelete={canDelete}
            canUpdate={canUpdate}
            entriesToDelete={entriesToDelete}
            headers={headers}
            onSelectRow={handleSelectRow}
            rows={rows}
            withBulkActions={withBulkActions}
            withMainAction={withMainAction}
          />
        )}
      </TableCompo>
    </>
  );
};

Table.defaultProps = {
  headers: [],
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

Table.propTypes = {
  canDelete: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  headers: PropTypes.array,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default Table;
