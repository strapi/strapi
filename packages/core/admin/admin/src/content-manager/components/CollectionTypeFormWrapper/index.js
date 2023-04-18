import { memo } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useFindRedirectionLink } from '../../hooks';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';

// This container is used to handle the CRUD
const CollectionTypeFormWrapper = ({ children, slug }) => {
  const { componentsDataStructure, contentTypeDataStructure, data, status } =
    useSelector(selectCrudReducer);
  const redirectionLink = useFindRedirectionLink(slug);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    status,
    redirectionLink,
  });
};

CollectionTypeFormWrapper.defaultProps = {
  id: null,
  origin: null,
};

CollectionTypeFormWrapper.propTypes = {
  children: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default memo(CollectionTypeFormWrapper, isEqual);
