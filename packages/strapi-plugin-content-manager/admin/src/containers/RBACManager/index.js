import React, { cloneElement, Children, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import PropTypes from 'prop-types';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { resetPermissions, setPermissions } from './actions';

const selectPermissions = state => state.get(`${pluginId}_rbacManager`).permissions;

const selectCollectionTypePermissions = state =>
  state.get('permissionsManager').collectionTypesRelatedPermissions;

const RBACManager = ({ query, ...props }) => {
  const collectionTypesRelatedPermissions = useSelector(selectCollectionTypePermissions);
  const permissions = useSelector(selectPermissions);
  const dispatch = useDispatch();
  const collectionTypeUID = props.slug;

  const relatedPermissions = collectionTypesRelatedPermissions[collectionTypeUID];

  useEffect(() => {
    if (query.pluginOptions && relatedPermissions) {
      dispatch(setPermissions(relatedPermissions, query.pluginOptions, 'listView'));

      return () => {
        dispatch(resetPermissions());
      };
    }
  }, [relatedPermissions, dispatch, query]);

  if (!permissions) {
    return <LoadingIndicatorPage />;
  }

  return Children.toArray(props.children).map(child => {
    return cloneElement(child, { ...child.props, permissions }, null);
  });
};

RBACManager.propTypes = {
  slug: PropTypes.string.isRequired,
};

export default RBACManager;
