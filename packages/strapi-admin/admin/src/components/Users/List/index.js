import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useReducer } from 'react';
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

const List = forwardRef(
  (
    { canDelete, canUpdate, data, filters, isLoading, onChange, onClickDelete, searchParam },
    ref
  ) => {
    const { push } = useHistory();
    const [{ rows }, dispatch] = useReducer(reducer, initialState, init);

    const { formatMessage } = useGlobalContext();

    useEffect(() => {
      dispatch({
        type: 'SET_DATA',
        data,
      });
    }, [data]);

    useImperativeHandle(ref, () => ({
      resetDataToDelete: () => {
        dispatch({
          type: 'RESET_DATA_TO_DELETE',
        });
      },
    }));

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

    const handleClickDelete = useCallback(
      id => {
        const rowIndex = rows.findIndex(obj => obj.id === id);

        dispatch({
          type: 'ON_CLICK_DELETE',
          index: rowIndex,
        });

        onClickDelete(id);
      },
      [rows, onClickDelete]
    );

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
          onClickRow={(e, data) => {
            handleClick(data.id);
          }}
          onSelect={handleChange}
          onSelectAll={handleChangeAll}
          rows={rows}
          rowLinks={[
            {
              icon: canUpdate ? <FontAwesomeIcon icon={faPencilAlt} /> : null,
              onClick: data => {
                handleClick(data.id);
              },
            },
            {
              icon: canDelete ? <FontAwesomeIcon icon={faTrashAlt} /> : null,
              onClick: data => {
                handleClickDelete(data.id);
              },
            },
          ]}
          tableEmptyText={tableEmptyTextTranslated}
          withBulkAction={canDelete}
        />
      </Wrapper>
    );
  }
);

List.defaultProps = {
  canDelete: false,
  canUpdate: false,
  data: [],
  filters: [],
  isLoading: false,
  onChange: () => {},
  onClickDelete: () => {},
  searchParam: '',
};

List.propTypes = {
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
  data: PropTypes.array,
  filters: PropTypes.array,
  isLoading: PropTypes.bool,
  onChange: PropTypes.func,
  onClickDelete: PropTypes.func,
  searchParam: PropTypes.string,
};

export default List;
