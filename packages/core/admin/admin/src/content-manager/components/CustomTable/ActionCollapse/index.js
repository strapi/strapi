import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../../pluginId';
import useListView from '../../../hooks/useListView';
import DeleteAll from './DeleteAll';
import Delete from './Delete';
import Wrapper from './Wrapper';

function ActionCollapse({ colSpan }) {
  const { data, entriesToDelete, toggleModalDeleteAll } = useListView();

  const number = entriesToDelete.length;
  const suffix = number > 1 ? 'plural' : 'singular';
  const deleteMessageId = number === data.length ? 'delete' : 'deleteSelected';

  return (
    <Wrapper colSpan={colSpan}>
      <td colSpan={colSpan}>
        <FormattedMessage
          id={`${pluginId}.components.TableDelete.entries.${suffix}`}
          values={{ number }}
        >
          {message => <Delete>{message}</Delete>}
        </FormattedMessage>
        <FormattedMessage id={`${pluginId}.components.TableDelete.${deleteMessageId}`}>
          {message => <DeleteAll onClick={toggleModalDeleteAll}>{message}</DeleteAll>}
        </FormattedMessage>
      </td>
    </Wrapper>
  );
}

ActionCollapse.propTypes = {
  colSpan: PropTypes.number.isRequired,
};

export default memo(ActionCollapse);
