import React from 'react';

import { ProtectedPage } from '../../components/ProtectedPage';

import { ReviewWorkflowsCreateView } from './CreateView';

export default function () {
  return (
    <ProtectedPage>
      <ReviewWorkflowsCreateView />
    </ProtectedPage>
  );
}
