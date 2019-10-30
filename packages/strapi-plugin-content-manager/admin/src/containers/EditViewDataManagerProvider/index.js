import React, { useReducer } from 'react';
// import { useHistory, useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
// import { get } from 'lodash';
import EditViewDataManagerContext from './context';
import init from './init';
import reducer, { initialState } from './reducer';

const EditViewDataManagerProvider = ({ children, layouts }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { initialData, modifiedData } = reducerState.toJS();

  const handleSubmit = e => {
    e.preventDefault();
    dispatch({
      type: 'SUBMIT_SUCCEEDED',
    });
  };

  return (
    <EditViewDataManagerContext.Provider
      value={(initialData, layouts, modifiedData)}
    >
      <form onSubmit={handleSubmit}>{children}</form>
    </EditViewDataManagerContext.Provider>
  );
};

EditViewDataManagerProvider.defaultProps = {};
EditViewDataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
  layouts: PropTypes.object.isRequired,
};

export default EditViewDataManagerProvider;
