import React from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { Information } from '../../../../../../admin/src/content-manager/pages/EditView/Information';

import { AssigneeSelect } from './components/AssigneeSelect';
import { StageSelect } from './components/StageSelect';

export function InformationBoxEE() {
  const {
    isCreatingEntry,
    layout: { options },
  } = useCMEditViewDataManager();

  const hasReviewWorkflowsEnabled = options?.reviewWorkflows ?? false;

  return (
    <Information.Root>
      <Information.Title />
      {hasReviewWorkflowsEnabled && !isCreatingEntry && (
        <>
          <StageSelect />
          <AssigneeSelect />
        </>
      )}
      <Information.Body />
    </Information.Root>
  );
}
