import React from 'react';

import { Flex, Loader, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import {
  useAPIErrorHandler,
  useCMEditViewDataManager,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { Information } from '../../../../../../admin/src/content-manager/pages/EditView/Information';
import { useLicenseLimits } from '../../../../hooks/useLicenseLimits';
import * as LimitsModal from '../../../../pages/SettingsPage/pages/ReviewWorkflows/components/LimitsModal';
import {
  CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME,
  CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME,
} from '../../../../pages/SettingsPage/pages/ReviewWorkflows/constants';
import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { getStageColorByHex } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/utils/colors';

const ATTRIBUTE_NAME = 'strapi_stage';

export function InformationBoxEE() {
  const {
    initialData,
    isCreatingEntry,
    layout: { uid, options },
    isSingleType,
    onChange,
  } = useCMEditViewDataManager();
  const { put } = useFetchClient();
  // it is possible to rely on initialData here, because it always will
  // be updated at the same time when modifiedData is updated, otherwise
  // the entity is flagged as modified
  const activeWorkflowStage = initialData?.[ATTRIBUTE_NAME] ?? null;
  const hasReviewWorkflowsEnabled = options?.reviewWorkflows ?? false;
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { getFeature } = useLicenseLimits();
  const [showLimitModal, setShowLimitModal] = React.useState(false);

  const {
    meta,
    workflows: [workflow],
    isLoading: isWorkflowLoading,
  } = useReviewWorkflows({ filters: { contentTypes: uid } });

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
            defaultMessage: 'Review stage updated',
          },
        });
      },
    }
  );

  const limits = getFeature('review-workflows');
  const formattedError = (error && formatAPIError(error)) || null;

  const handleStageChange = async ({ value: stageId }) => {
    try {
      /**
       * If the current license has a limit:
       * check if the total count of workflows exceeds that limit and display
       * the limits modal.
       *
       * If the current license does not have a limit (e.g. offline license):
       * do nothing (for now).
       *
       */

      if (
        limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
        parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10) < meta.workflowCount
      ) {
        setShowLimitModal('workflow');

        /**
         * If the current license has a limit:
         * check if the total count of stages exceeds that limit and display
         * the limits modal.
         *
         * If the current license does not have a limit (e.g. offline license):
         * do nothing (for now).
         *
         */
      } else if (
        limits?.[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME] &&
        parseInt(limits[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME], 10) <
          workflow.stages.length
      ) {
        setShowLimitModal('stage');
      } else {
        await mutateAsync({
          entityId: initialData.id,
          stageId,
          uid,
        });
      }
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
              {isWorkflowLoading || isLoading ? <Loader small style={{ display: 'flex' }} /> : null}
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

      <LimitsModal.Root
        isOpen={showLimitModal === 'workflow'}
        onClose={() => setShowLimitModal(false)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.workflows.limit.title',
            defaultMessage: 'You’ve reached the limit of workflows in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.workflows.limit.body',
            defaultMessage: 'Delete a workflow or contact Sales to enable more workflows.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>

      <LimitsModal.Root
        isOpen={showLimitModal === 'stage'}
        onClose={() => setShowLimitModal(false)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.stages.limit.title',
            defaultMessage: 'You have reached the limit of stages for this workflow in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.stages.limit.body',
            defaultMessage: 'Try deleting some stages or contact Sales to enable more stages.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>
    </Information.Root>
  );
}
