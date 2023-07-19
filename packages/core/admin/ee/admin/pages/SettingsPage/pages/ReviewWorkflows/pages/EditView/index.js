import React from 'react';

import { ProtectedPage } from '../../components/ProtectedPage';

import { ReviewWorkflowsEditView } from './EditView';

export default function () {
  return (
    <ProtectedPage>
      <ReviewWorkflowsEditView />
    </ProtectedPage>
  );
}
