import React, { useState } from 'react';
import { ReactSelect, useCMEditViewDataManager, useAPIErrorHandler } from '@strapi/helper-plugin';
import { Field, FieldLabel, FieldError, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import Information from '../../../../../../admin/src/content-manager/pages/EditView/Information';

const ATTRIBUTE_NAME = 'strapi_reviewWorkflows_stage';

export function InformationBoxEE() {
  const {
    initialData,
    isCreatingEntry,
    layout: { uid },
  } = useCMEditViewDataManager();
  const activeWorkflowStage = initialData?.[ATTRIBUTE_NAME] ?? null;
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    workflows: { data: workflow },
    entityStageMutation,
    setStageForEntity,
  } = useReviewWorkflows(activeWorkflowStage?.id);
  // stages are empty while the workflow is loading
  const options = (workflow?.stages ?? []).map(({ id, name }) => ({ value: id, label: name }));
  const [error, setError] = useState(null);

  const handleStageChange = async ({ value: stageId }) => {
    try {
      await setStageForEntity({
        entityId: initialData.id,
        stageId,
        uid,
      });
    } catch (error) {
      setError(formatAPIError(error));
    }
  };

  return (
    <Information.Root>
      <Information.Title />

      {activeWorkflowStage && (
        <Field error={error} name={ATTRIBUTE_NAME}>
          <Flex direction="column" gap={2} alignItems="stretch">
            <FieldLabel>
              {formatMessage({
                id: 'content-manager.reviewWorkflows.stage.label',
                defaultMessage: 'Review stage',
              })}
            </FieldLabel>

            <ReactSelect
              error={error}
              inputId={ATTRIBUTE_NAME}
              isDisabled={isCreatingEntry}
              options={options}
              name={ATTRIBUTE_NAME}
              defaultValue={{ value: activeWorkflowStage?.id, label: activeWorkflowStage?.name }}
              isLoading={entityStageMutation.isLoading}
              isSearchable={false}
              isClearable={false}
              onChange={handleStageChange}
            />

            {error && <FieldError />}
          </Flex>
        </Field>
      )}

      <Information.Body />
    </Information.Root>
  );
}
