import React, { memo, useMemo } from 'react';

import { LoadingIndicatorPage, useRBAC } from '@strapi/helper-plugin';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';

import { generatePermissionsObject } from '../../utils';
import EditView from '../EditView';

const Permissions = (props) => {
  const viewPermissions = useMemo(() => generatePermissionsObject(props.slug), [props.slug]);
  const { isLoading, allowedActions } = useRBAC(viewPermissions, props.userPermissions);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return <EditView {...props} allowedActions={allowedActions} />;
};

Permissions.defaultProps = {
  permissions: [],
};

Permissions.propTypes = {
  permissions: PropTypes.array,
  slug: PropTypes.string.isRequired,
  userPermissions: PropTypes.array.isRequired,
};

// This avoids the components to rerender on params change causing multiple requests to be fired
export default memo(Permissions, isEqual);
