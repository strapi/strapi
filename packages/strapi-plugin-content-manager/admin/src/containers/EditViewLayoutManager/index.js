import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingIndicatorPage, useQueryParams } from 'strapi-helper-plugin';
import EditView from '../EditView';
import useSyncRbac from '../RBACManager/useSyncRbac';
import { resetProps, setLayout } from './actions';
import selectLayout from './selectors';

const EditViewLayoutManager = ({ layout, ...rest }) => {
  const currentLayout = useSelector(selectLayout);
  const dispatch = useDispatch();
  const [{ query }] = useQueryParams();
  const queryWithPluginOptions = useMemo(() => ({ pluginOptions: { ...query } }), [query]);
  const permissions = useSyncRbac(queryWithPluginOptions, rest.slug, 'editView');

  useEffect(() => {
    dispatch(setLayout(layout, query));

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch, query]);

  if (!currentLayout) {
    return <LoadingIndicatorPage />;
  }

  return <EditView {...rest} layout={currentLayout} userPermissions={permissions} />;
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
