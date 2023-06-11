import React from 'react';
import {
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { Flex, Loader, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import Information from '../../../../../../admin/src/content-manager/pages/EditView/Information';
import { getStageColorByHex } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/utils/colors';

const ATTRIBUTE_NAME = 'strapi_reviewWorkflows_stage';

export function InformationBoxEE() {
  const {
    initialData,
    isCreatingEntry,
    layout: { uid },
    isSingleType,
    onChange,
  } = useCMEditViewDataManager();
  const { put } = useFetchClient();
  // it is possible to rely on initialData here, because it always will
  // be updated at the same time when modifiedData is updated, otherwise
  // the entity is flagged as modified
  const activeWorkflowStage = initialData?.[ATTRIBUTE_NAME] ?? null;
  const hasReviewWorkflowsEnabled = Object.prototype.hasOwnProperty.call(
    initialData,
    ATTRIBUTE_NAME
  );
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();

  const { workflows, isLoading: workflowIsLoading } = useReviewWorkflows();
  // TODO: this works only as long as we support one workflow
  const workflow = workflows?.[0] ?? null;

  const { error, isLoading, mutateAsync } = useMutation(
    async ({ entityId, stageId, uid }) => {
      const typeSlug = isSingleType ? 'single-types' : 'collection-types';

      const {
        data: { data: createdEntity },
      } = await put(`/admin/content-manager/${typeSlug}/${uid}/${entityId}/stage`, {
        data: { id: stageId },
      });

      // initialData and modifiedData have to stay in sync, otherwise the entity would be flagged
      // as modified, which is what the boolean flag is for
      onChange({ target: { name: ATTRIBUTE_NAME, value: createdEntity[ATTRIBUTE_NAME] } }, true);

      return createdEntity;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: {
            id: 'content-manager.reviewWorkflows.stage.notification.saved',
            defaultMessage: 'Success: Review stage updated',
          },
        });
      },
    }
  );

  // if entities are created e.g. through lifecycle methods
  // they may not have a stage assigned. Updating the entity won't
  // set the default stage either which may lead to entities that
  // do not have a stage assigned for a while. By displaying an
  // error by default we are trying to nudge users into assigning a stage.
  const initialStageNullError =
    activeWorkflowStage === null &&
    !workflowIsLoading &&
    !isCreatingEntry &&
    formatMessage({
      id: 'content-manager.reviewWorkflows.stage.select.placeholder',
      defaultMessage: 'Select a stage',
    });
  const formattedMutationError = error && formatAPIError(error);
  const formattedError = formattedMutationError || initialStageNullError || null;

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

  const { themeColorName } = activeWorkflowStage?.color
    ? getStageColorByHex(activeWorkflowStage?.color)
    : {};

  return (
    <Information.Root>
      <Information.Title />

      {hasReviewWorkflowsEnabled && !isCreatingEntry && (
        <SingleSelect
          error={formattedError}
          name={ATTRIBUTE_NAME}
          id={ATTRIBUTE_NAME}
          value={activeWorkflowStage?.id}
          onChange={(value) => handleStageChange({ value })}
          label={formatMessage({
            id: 'content-manager.reviewWorkflows.stage.label',
            defaultMessage: 'Review stage',
          })}
          startIcon={
            <Flex
              as="span"
              height={2}
              background={activeWorkflowStage?.color}
              borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
              hasRadius
              shrink={0}
              width={2}
              marginRight="-3px"
            />
          }
          // eslint-disable-next-line react/no-unstable-nested-components
          customizeContent={() => (
            <Flex as="span" justifyContent="space-between" alignItems="center" width="100%">
              <Typography textColor="neutral800" ellipsis>
                {activeWorkflowStage?.name}
              </Typography>
              {isLoading ? <Loader small style={{ display: 'flex' }} /> : null}
            </Flex>
          )}
        >
          {workflow
            ? workflow.stages.map(({ id, color, name }) => {
                const { themeColorName } = getStageColorByHex(color);

                return (
                  <SingleSelectOption
                    startIcon={
                      <Flex
                        height={2}
                        background={color}
                        borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
                        hasRadius
                        shrink={0}
                        width={2}
                      />
                    }
                    value={id}
                    textValue={name}
                  >
                    {name}
                  </SingleSelectOption>
                );
              })
            : []}
        </SingleSelect>
      )}

      <Information.Body />
    </Information.Root>
  );
}
