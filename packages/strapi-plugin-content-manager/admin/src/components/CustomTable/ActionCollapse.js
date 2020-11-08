import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useListView from '../../hooks/useListView';
import { DeletAllSpan, DeleteSpan, TableDelete } from './styledComponents';

function ActionCollapse({ colSpan }) {
  const { data, entriesToDelete, toggleModalDeleteAll } = useListView();

  const number = entriesToDelete.length;
  const suffix = number > 1 ? 'plural' : 'singular';
  const deleteMessageId = number === data.length ? 'delete' : 'deleteSelected';

  return (
    <TableDelete colSpan={colSpan}>
      <td colSpan={colSpan}>
        <FormattedMessage
          id={`${pluginId}.components.TableDelete.entries.${suffix}`}
          values={{ number }}
        >
          {message => <DeleteSpan>{message}</DeleteSpan>}
        </FormattedMessage>
        <FormattedMessage
          id={`${pluginId}.components.TableDelete.${deleteMessageId}`}
        >
          {message => (
            <DeletAllSpan onClick={toggleModalDeleteAll}>
              {message}
            </DeletAllSpan>
          )}
        </FormattedMessage>
      </td>
    </TableDelete>
  );
}

ActionCollapse.propTypes = {
  colSpan: PropTypes.number.isRequired,
};

export default memo(ActionCollapse);
