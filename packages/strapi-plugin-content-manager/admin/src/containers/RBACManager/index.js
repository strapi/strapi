import React, { cloneElement, Children, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { resetPermissions, setPermissions } from './actions';

const RBACManager = props => {
  const { collectionTypesRelatedPermissions } = useSelector(state =>
    state.get('permissionsManager')
  );
  const { permissions } = useSelector(state => state.get(`${pluginId}_rbacManager`));
  const dispatch = useDispatch();
  const collectionTypeUID = props.slug;

  useEffect(() => {
    const relatedPermissions = get(collectionTypesRelatedPermissions, [collectionTypeUID], {});

    dispatch(setPermissions(relatedPermissions));

    return () => {
      dispatch(resetPermissions());
    };
  }, [collectionTypeUID, collectionTypesRelatedPermissions, dispatch]);

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
