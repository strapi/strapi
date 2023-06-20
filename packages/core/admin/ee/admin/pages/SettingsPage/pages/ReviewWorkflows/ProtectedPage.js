import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../../admin/src/pages/App/selectors';

import { ReviewWorkflowsPage } from './ReviewWorkflows';

const ProtectedListPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings['review-workflows'].main}>
      <ReviewWorkflowsPage />
    </CheckPagePermissions>
  );
};

export default ProtectedListPage;
