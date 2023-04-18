import { memo } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';

// This container is used to handle the CRUD
const SingleTypeFormWrapper = ({ children }) => {
  const { componentsDataStructure, contentTypeDataStructure, data, status } =
    useSelector(selectCrudReducer);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    redirectionLink: '/',
    status,
  });
};

SingleTypeFormWrapper.propTypes = {
  children: PropTypes.func.isRequired,
};

export default memo(SingleTypeFormWrapper);
