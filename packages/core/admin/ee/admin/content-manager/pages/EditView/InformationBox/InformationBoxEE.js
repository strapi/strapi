import React from 'react';
import {
  ReactSelect,
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useFetchClient,
} from '@strapi/helper-plugin';
import { Field, FieldLabel, FieldError, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import Information from '../../../../../../admin/src/content-manager/pages/EditView/Information';

const ATTRIBUTE_NAME = 'strapi_reviewWorkflows_stage';

export function InformationBoxEE() {
  const {
    initialData,
    isCreatingEntry,
    layout: { uid },
  } = useCMEditViewDataManager();
  const { put } = useFetchClient();
  const activeWorkflowStage = initialData?.[ATTRIBUTE_NAME] ?? null;
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();

  const {
    workflows: { data: workflow },
  } = useReviewWorkflows(activeWorkflowStage?.id);

  const { error, isLoading, mutateAsync } = useMutation(async ({ entityId, stageId, uid }) => {
    const {
      data: { data },
    } = await put(`/admin/content-manager/collection-types/${uid}/${entityId}/stage`, {
      data: { id: stageId },
    });

    return data;
  });

  // stages are empty while the workflow is loading
  const options = (workflow?.stages ?? []).map(({ id, name }) => ({ value: id, label: name }));
  const formattedError = error ? formatAPIError(error) : null;

  const handleStageChange = async ({ value: stageId }) => {
    try {
      await mutateAsync({
        entityId: initialData.id,
        stageId,
        uid,
      });
    } catch (error) {
      // react-query@v3: the error doesn't have to be handled here
      // see: https://github.com/TanStack/query/issues/121
    }
  };

  return (
    <Information.Root>
      <Information.Title />

      {activeWorkflowStage && (
        <Field error={formattedError} name={ATTRIBUTE_NAME}>
          <Flex direction="column" gap={2} alignItems="stretch">
            <FieldLabel>
              {formatMessage({
                id: 'content-manager.reviewWorkflows.stage.label',
                defaultMessage: 'Review stage',
              })}
            </FieldLabel>

            <ReactSelect
              error={formattedError}
              inputId={ATTRIBUTE_NAME}
              isDisabled={isCreatingEntry}
              options={options}
              name={ATTRIBUTE_NAME}
              defaultValue={{ value: activeWorkflowStage?.id, label: activeWorkflowStage?.name }}
              isLoading={isLoading}
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
