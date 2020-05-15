import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { Table } from '@buffetjs/core';
import { cloneDeep } from 'lodash';
import { useQuery, useGlobalContext } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { SETTINGS_BASE_URL } from '../../../config';
import Wrapper from './Wrapper';
import ActiveStatus from './ActiveStatus';

const headers = [
  {
    cellFormatter: (cellData, rowData) => {
      return `${cellData} ${rowData.lastname}`;
    },
    name: 'name',
    value: 'firstname',
  },
  {
    name: 'email',
    value: 'email',
  },
  {
    cellFormatter: cellData => cellData.join(',\n'),
    name: 'roles',
    value: 'roles',
  },
  {
    name: 'username',
    value: 'username',
  },
  {
    // eslint-disable-next-line react/prop-types
    cellAdapter: ({ isActive }) => {
      return (
        <>
          <ActiveStatus isActive={isActive}>{isActive ? 'Active' : 'Inactive'}</ActiveStatus>
        </>
      );
    },
    name: 'active user',
    value: 'isActive',
  },
];

const updateRows = (array, shouldSelect = true) =>
  array.map(row => {
    row._isChecked = shouldSelect;

    return row;
  });

const List = ({ isLoading, rows }) => {
  const query = useQuery();
  const { push } = useHistory();

  const { formatMessage } = useGlobalContext();
  const searchParam = query.get('_q');
  let tableEmptyText = 'Users.components.List.empty';

  // TODO filters logic
  if (searchParam) {
    tableEmptyText = `${tableEmptyText}.withSearch`;

    // text with filters ends with `.withFilters`
  }

  const tableEmptyTextTranslated = formatMessage({ id: tableEmptyText }, { search: searchParam });

  const handleClick = id => {
    push(`${SETTINGS_BASE_URL}/users/${id}`);
  };

  return (
    <Wrapper withHigherHeight={!rows.length}>
      <Table
        className="table-wrapper"
        isLoading={isLoading}
        headers={headers}
        onClickRow={(e, data) => {
          handleClick(data.id);
        }}
        // onSelect={(row, index) => {
        //   dispatch({ type: 'SELECT_ROW', row, index });
        // }}
        // onSelectAll={() => {
        //   const type = areAllEntriesSelected ? 'UNSELECT_ALL' : 'SELECT_ALL';

        //   dispatch({ type });
        // }}
        rows={updateRows(cloneDeep(rows))}
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
  isLoading: false,
  rows: [],
};

List.propTypes = {
  isLoading: PropTypes.bool,
  rows: PropTypes.array,
};

export default List;
