import React from 'react';

import { ProtectedPage } from '../../components/ProtectedPage';

import { ReviewWorkflowsListView } from './ListView';

export default function () {
  return (
    <ProtectedPage>
      <ReviewWorkflowsListView />
    </ProtectedPage>
  );
}
