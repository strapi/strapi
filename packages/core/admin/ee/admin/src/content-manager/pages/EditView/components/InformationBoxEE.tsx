import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { Information } from '../../../../../../../admin/src/content-manager/pages/EditView/components/Information';

import { AssigneeSelect } from './AssigneeSelect';
import { StageSelect } from './StageSelect';

const InformationBoxEE = () => {
  const { isCreatingEntry, layout } = useCMEditViewDataManager();

  const hasReviewWorkflowsEnabled = layout?.options?.reviewWorkflows ?? false;

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
};

export { InformationBoxEE };
