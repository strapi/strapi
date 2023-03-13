import React from 'react';
import { ReactSelect, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { FieldLabel, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import Information from '../../../../../../admin/src/content-manager/pages/EditView/Information';

const ATTRIBUTE_NAME = 'strapi_reviewWorkflows_stage';

export function InformationBoxEE() {
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();
  const { formatMessage } = useIntl();

  const activeWorkflowStage = initialData?.[ATTRIBUTE_NAME] ?? null;
  const {
    workflows: { data: workflow },
  } = useReviewWorkflows(1);
  // stages are empty while the workflow is loaded
  const options = (workflow?.stages ?? []).map(({ id, name }) => ({ value: id, label: name }));

  return (
    <Information.Root>
      <Information.Title />
      {activeWorkflowStage && (
        <Flex direction="column" gap={2} alignItems="stretch">
          <FieldLabel htmlFor={ATTRIBUTE_NAME}>
            {formatMessage({
              id: 'content-manager.reviewWorkflows.stage.label',
              defaultMessage: 'Review stage',
            })}
          </FieldLabel>

          <ReactSelect
            inputId={ATTRIBUTE_NAME}
            isDisabled={isCreatingEntry}
            options={options}
            name={ATTRIBUTE_NAME}
            defaultValue={{ value: activeWorkflowStage?.id, label: activeWorkflowStage?.name }}
            isSearchable={false}
            isClearable={false}
          />
        </Flex>
      )}
      <Information.Body />
    </Information.Root>
  );
}
