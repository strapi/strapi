import * as React from 'react';

import { useNotification, useAPIErrorHandler, useQueryParams } from '@strapi/admin/strapi-admin';
import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import {
  SingleSelect,
  SingleSelectOption,
  Field,
  Flex,
  Loader,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { LimitsModal } from '../../../../../components/LimitsModal';
import {
  CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME,
  CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME,
} from '../../../../../constants';
import { useGetStagesQuery, useUpdateStageMutation } from '../../../../../services/content-manager';
import { buildValidParams } from '../../../../../utils/api';
import { getStageColorByHex } from '../../../../../utils/colors';

import { STAGE_ATTRIBUTE_NAME } from './constants';

import type { Data } from '@strapi/types';

export const StageSelect = () => {
  const {
    collectionType = '',
    slug: model = '',
    id = '',
  } = useParams<{
    collectionType: string;
    slug: string;
    id: string;
  }>();
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const { document, isLoading: isLoadingDocument } = unstable_useDocument(
    {
      collectionType,
      model,
      documentId: id,
    },
    {
      skip: !id && collectionType !== 'single-types',
    }
  );

  const { data, isLoading: isLoadingStages } = useGetStagesQuery(
    {
      slug: collectionType,
      model: model,
      // @ts-expect-error – `id` is not correctly typed in the DS.
      id: document?.documentId,
      params,
    },
    {
      skip: !document?.documentId,
    }
  );

  const { meta, stages = [] } = data ?? {};

  const { getFeature } = useLicenseLimits();
  const [showLimitModal, setShowLimitModal] = React.useState<'stage' | 'workflow' | null>(null);

  const limits = getFeature<string>('review-workflows') ?? {};

  const activeWorkflowStage = document ? document[STAGE_ATTRIBUTE_NAME] : null;

  const [updateStage, { error }] = useUpdateStageMutation();

  const handleChange = async (stageId: Data.ID) => {
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
        parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10) < (meta?.workflowCount ?? 0)
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
        parseInt(limits[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME], 10) < stages.length
      ) {
        setShowLimitModal('stage');
      } else {
        if (document?.documentId) {
          const res = await updateStage({
            model,
            id: document.documentId,
            slug: collectionType,
            params,
            data: { id: stageId },
          });

          if ('data' in res) {
            toggleNotification({
              type: 'success',
              message: formatMessage({
                id: 'content-manager.reviewWorkflows.stage.notification.saved',
                defaultMessage: 'Review stage updated',
              }),
            });
          }
        }
      }
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'content-manager.reviewWorkflows.stage.notification.error',
          defaultMessage: 'An error occurred while updating the review stage',
        }),
      });
    }
  };

  const { themeColorName } = getStageColorByHex(activeWorkflowStage?.color) ?? {};

  const isLoading = isLoadingStages || isLoadingDocument;

  return (
    <>
      <Field.Root
        hint={
          !isLoading &&
          stages.length === 0 &&
          formatMessage({
            id: 'content-manager.reviewWorkflows.stages.no-transition',
            defaultMessage: 'You don’t have the permission to update this stage.',
          })
        }
        error={(error && formatAPIError(error)) || undefined}
        name={STAGE_ATTRIBUTE_NAME}
        id={STAGE_ATTRIBUTE_NAME}
      >
        <Field.Label>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.stage.label',
            defaultMessage: 'Review stage',
          })}
        </Field.Label>
        <SingleSelect
          disabled={stages.length === 0}
          value={activeWorkflowStage?.id}
          onChange={handleChange}
          placeholder={formatMessage({
            id: 'content-manager.reviewWorkflows.assignee.placeholder',
            defaultMessage: 'Select…',
          })}
          startIcon={
            activeWorkflowStage && (
              <Flex
                tag="span"
                height={2}
                background={activeWorkflowStage?.color}
                borderColor={themeColorName === 'neutral0' ? 'neutral150' : undefined}
                hasRadius
                shrink={0}
                width={2}
                marginRight="-3px"
              />
            )
          }
          // @ts-expect-error – `customizeContent` is not correctly typed in the DS.
          customizeContent={() => {
            return (
              <Flex tag="span" justifyContent="space-between" alignItems="center" width="100%">
                <Typography textColor="neutral800" ellipsis>
                  {activeWorkflowStage?.name ?? ''}
                </Typography>
                {isLoading ? (
                  <Loader small style={{ display: 'flex' }} data-testid="loader" />
                ) : null}
              </Flex>
            );
          }}
        >
          {stages.map(({ id, color, name }) => {
            const { themeColorName } = getStageColorByHex(color) ?? {};

            return (
              <SingleSelectOption
                key={id}
                startIcon={
                  <Flex
                    height={2}
                    background={color}
                    borderColor={themeColorName === 'neutral0' ? 'neutral150' : undefined}
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
          })}
        </SingleSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>

      <LimitsModal.Root
        open={showLimitModal === 'workflow'}
        onOpenChange={() => setShowLimitModal(null)}
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
        open={showLimitModal === 'stage'}
        onOpenChange={() => setShowLimitModal(null)}
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
    </>
  );
};
