import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../../../../admin/src/pages/App/selectors';

export function ProtectedPage({ children }) {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings['review-workflows'].main}>
      {children}
    </CheckPagePermissions>
  );
}

ProtectedPage.propTypes = {
  children: PropTypes.node.isRequired,
};
