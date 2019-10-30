import React, { useReducer } from 'react';
// import { useHistory, useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
// import { get } from 'lodash';
import EditViewDataManagerContext from '../../contexts/EditViewDataManager';

import init from './init';
import reducer, { initialState } from './reducer';

// const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const EditViewDataManagerProvider = ({ children, layout }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { initialData, modifiedData } = reducerState.toJS();

  const addRelation = ({ target: { name, value } }) => {
    dispatch({
      type: 'ADD_RELATION',
      keys: name.split('.'),
      value,
    });
  };

  const handleChange = ({ target: { name, value, type } }) => {
    let inputValue = value;

    // Empty string is not a valid date,
    // Set the date to null when it's empty
    if (type === 'date' && value === '') {
      inputValue = null;
    }

    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value: inputValue,
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    dispatch({
      type: 'SUBMIT_SUCCEEDED',
    });
  };

  const moveRelation = (dragIndex, overIndex, name) => {
    dispatch({
      type: 'MOVE_FIELD',
      dragIndex,
      overIndex,
      keys: name.split('.'),
    });
  };

  const onRemoveRelation = keys => {
    dispatch({
      type: 'REMOVE_RELATION',
      keys,
    });
  };

  return (
    <EditViewDataManagerContext.Provider
      value={{
        addRelation,
        initialData,
        layout,
        modifiedData,
        moveRelation,
        onChange: handleChange,
        onRemoveRelation,
      }}
    >
      <form onSubmit={handleSubmit}>{children}</form>
    </EditViewDataManagerContext.Provider>
  );
};

EditViewDataManagerProvider.defaultProps = {};
EditViewDataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
  layout: PropTypes.object.isRequired,
};

export default EditViewDataManagerProvider;
