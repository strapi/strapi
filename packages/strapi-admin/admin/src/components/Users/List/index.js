import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { Table } from '@buffetjs/core';
import { useGlobalContext } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { SETTINGS_BASE_URL } from '../../../config';
import { checkIfAllEntriesAreSelected, getSelectedIds, headers } from './utils';
import { initialState, reducer } from './reducer';
import init from './init';
import Wrapper from './Wrapper';

// TODO this component should handle the users that are already selected
// we need to add this logic
const List = ({ data, filters, isLoading, onChange, searchParam }) => {
  const { push } = useHistory();
  const [{ rows }, dispatch] = useReducer(reducer, initialState, init);

  const { formatMessage } = useGlobalContext();

  // TODO: test the effects we might need to add the isLoading prop in the dependencies array
  useEffect(() => {
    dispatch({
      type: 'SET_DATA',
      data,
    });
  }, [data]);

  let tableEmptyText = 'Users.components.List.empty';

  if (searchParam) {
    tableEmptyText = `${tableEmptyText}.withSearch`;
  }

  if (filters.length) {
    tableEmptyText = `${tableEmptyText}.withFilters`;
  }

  const tableEmptyTextTranslated = formatMessage({ id: tableEmptyText }, { search: searchParam });

  const handleChange = (row, index) => {
    dispatch({
      type: 'ON_CHANGE',
      index,
    });

    onChange(getSelectedIds(rows, index));
  };

  const handleChangeAll = () => {
    dispatch({
      type: 'ON_CHANGE_ALL',
    });

    let selectedIds = [];
    const areAllEntriesSelected = checkIfAllEntriesAreSelected(rows);

    if (!areAllEntriesSelected) {
      for (let i = 0; i < rows.length; i++) {
        selectedIds.push(rows[i].id);
      }
    }

    onChange(selectedIds);
  };

  const handleClick = id => {
    push(`${SETTINGS_BASE_URL}/users/${id}`);
  };

  return (
    <Wrapper withHigherHeight={!data.length}>
      <Table
        className="table-wrapper"
        isLoading={isLoading}
        headers={headers}
        onSelect={handleChange}
        onSelectAll={handleChangeAll}
        rows={rows}
        rowLinks={[
          {
            icon: <FontAwesomeIcon icon={faPencilAlt} />,
            onClick: data => {
              handleClick(data.id);
            },
          },
          {
            icon: <FontAwesomeIcon icon={faTrashAlt} />,
            onClick: data => {
              console.log(data);
            },
          },
        ]}
        tableEmptyText={tableEmptyTextTranslated}
        withBulkAction
      />
    </Wrapper>
  );
};

List.defaultProps = {
  data: [],
  filters: [],
  isLoading: false,
  onChange: () => {},
  searchParam: '',
};

List.propTypes = {
  data: PropTypes.array,
  filters: PropTypes.array,
  isLoading: PropTypes.bool,
  onChange: PropTypes.func,
  searchParam: PropTypes.string,
};

export default List;
