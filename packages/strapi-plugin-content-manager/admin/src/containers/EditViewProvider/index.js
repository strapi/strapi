import React from 'react';
import PropTypes from 'prop-types';

import EditViewContext from '../../contexts/EditView';

function EditViewProvider({ children, ...rest }) {
  return (
    <EditViewContext.Provider value={rest}>{children}</EditViewContext.Provider>
  );
}

EditViewProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default EditViewProvider;
