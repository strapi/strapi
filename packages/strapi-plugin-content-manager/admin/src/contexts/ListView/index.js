import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const ListViewContext = createContext();

// A provider
export function ListViewProvider({ children, ...rest }) {
  return (
    <ListViewContext.Provider value={rest}>{children}</ListViewContext.Provider>
  );
}

// Hook permettant de récupérer le contexte i18n
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
