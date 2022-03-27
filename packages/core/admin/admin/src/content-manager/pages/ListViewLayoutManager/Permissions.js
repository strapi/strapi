import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useRBAC, LoadingIndicatorPage, difference } from '@strapi/helper-plugin';

import ListView from '../ListView';
import { generatePermissionsObject } from '../../utils';

const Permissions = props => {
  const viewPermissions = useMemo(() => generatePermissionsObject(props.slug), [props.slug]);

  const { isLoading, allowedActions } = useRBAC(viewPermissions, props.permissions);

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
export default memo(Permissions, (prev, next) => {
  const differenceBetweenRerenders = difference(prev, next);
  // Here the submenu is using a navlink which doesn't support the state
  // When we navigate from the EV to the LV using the menu the state is lost at some point
  // and this causes the component to rerender twice and firing requests twice
  // this hack prevents this
  // TODO at some point we will need to refactor the LV and migrate to react-query
  const propNamesThatHaveChanged = Object.keys(differenceBetweenRerenders).filter(
    propName => propName !== 'state'
  );

  return propNamesThatHaveChanged.length > 0;
});
