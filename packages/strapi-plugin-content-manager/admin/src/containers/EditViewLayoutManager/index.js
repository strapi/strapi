import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingIndicatorPage, useQueryParams } from 'strapi-helper-plugin';
import useSyncRbac from '../RBACManager/useSyncRbac';
import { resetProps, setLayout } from './actions';
import selectLayout from './selectors';
import Permissions from './Permissions';

const EditViewLayoutManager = ({ layout, ...rest }) => {
  const currentLayout = useSelector(selectLayout);
  const dispatch = useDispatch();
  const [{ query }] = useQueryParams();
  const permissions = useSyncRbac(query, rest.slug, 'editView');

  useEffect(() => {
    dispatch(setLayout(layout, query));

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch, query]);

  if (!currentLayout || !permissions) {
    return <LoadingIndicatorPage />;
  }

  return <Permissions {...rest} layout={currentLayout} userPermissions={permissions} />;
};

EditViewLayoutManager.propTypes = {
  layout: PropTypes.shape({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      uid: PropTypes.string.isRequired,
      settings: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      options: PropTypes.object.isRequired,
      attributes: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};

export default EditViewLayoutManager;
