import React from 'react';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import Information from '../../../../../../admin/src/content-manager/pages/EditView/Information';
import { STAGE_ATTRIBUTE_NAME } from './constants';
import { AssigneeSelect } from './components/AssigneeSelect';
import { StageSelect } from './components/StageSelect';

export function InformationBoxEE() {
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();
  // it is possible to rely on initialData here, because it always will
  // be updated at the same time when modifiedData is updated, otherwise
  // the entity is flagged as modified
  const hasReviewWorkflowsEnabled = Object.prototype.hasOwnProperty.call(
    initialData,
    STAGE_ATTRIBUTE_NAME
  );

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
