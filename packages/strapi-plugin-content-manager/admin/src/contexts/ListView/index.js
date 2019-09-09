import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const ListViewContext = createContext();

export function ListViewProvider({ children, ...rest }) {
  return (
    <ListViewContext.Provider value={rest}>{children}</ListViewContext.Provider>
  );
}

export function useListView() {
  return useContext(ListViewContext);
}

ListViewProvider.defaultProps = {
  firstSortableElement: 'id',
  onChangeParams: () => {},
  slug: '',
};

ListViewProvider.propTypes = {
  children: PropTypes.node.isRequired,
  firstSortableElement: PropTypes.string,
  onChangeParams: PropTypes.func,
  slug: PropTypes.string,
};
