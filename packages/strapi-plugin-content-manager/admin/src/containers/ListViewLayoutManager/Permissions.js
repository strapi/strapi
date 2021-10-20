import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useUserPermissions, LoadingIndicatorPage } from 'strapi-helper-plugin';
import isEqual from 'react-fast-compare';
import ListView from '../ListView';
import { generatePermissionsObject } from '../../utils';

const Permissions = props => {
  const viewPermissions = useMemo(() => generatePermissionsObject(props.slug), [props.slug]);
  const { isLoading, allowedActions } = useUserPermissions(viewPermissions, props.permissions);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return <ListView {...props} {...allowedActions} />;
};

Permissions.defaultProps = {
  permissions: [],
};

Permissions.propTypes = {
  permissions: PropTypes.array,
  slug: PropTypes.string.isRequired,
};

// This avoids the components to rerender on params change causing multiple requests to be fired
export default memo(Permissions, isEqual);
