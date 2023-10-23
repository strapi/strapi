import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../../../../admin/src/pages/App/selectors';

import { ReviewWorkflowsListView } from './ListView';

export default function () {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings['review-workflows'].main}>
      <ReviewWorkflowsListView />
    </CheckPagePermissions>
  );
}
