import * as React from 'react';

import {
  SingleSelect,
  SingleSelectOption,
  Field,
  FieldError,
  Flex,
  Loader,
  Typography,
} from '@strapi/design-system';
import {
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { useReviewWorkflows } from '../../../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { getStageColorByHex } from '../../../../../../pages/SettingsPage/pages/ReviewWorkflows/utils/colors';
import { STAGE_ATTRIBUTE_NAME } from '../../constants';

export function StageSelect() {
  const {
    initialData,
    isCreatingEntry,
    layout: { uid },
    isSingleType,
    onChange,
  } = useCMEditViewDataManager();
  const { put } = useFetchClient();
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { workflows, isLoading } = useReviewWorkflows();

  const activeWorkflowStage = initialData?.[STAGE_ATTRIBUTE_NAME] ?? null;

  // TODO: this works only as long as we support one workflow
  const workflow = workflows?.[0] ?? null;

  // it is possible to rely on initialData here, because it always will
  // be updated at the same time when modifiedData is updated, otherwise
  // the entity is flagged as modified
  const currentWorkflowStage = initialData?.[STAGE_ATTRIBUTE_NAME] ?? null;

  const mutation = useMutation(
    async ({ entityId, stageId, uid }) => {
      const typeSlug = isSingleType ? 'single-types' : 'collection-types';

      const {
        data: { data: createdEntity },
      } = await put(`/admin/content-manager/${typeSlug}/${uid}/${entityId}/stage`, {
        data: { id: stageId },
      });

      // initialData and modifiedData have to stay in sync, otherwise the entity would be flagged
      // as modified, which is what the boolean flag is for
      onChange(
        { target: { name: STAGE_ATTRIBUTE_NAME, value: createdEntity[STAGE_ATTRIBUTE_NAME] } },
        true
      );

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
    currentWorkflowStage === null &&
    !isLoading &&
    !isCreatingEntry &&
    formatMessage({
      id: 'content-manager.reviewWorkflows.stage.select.placeholder',
      defaultMessage: 'Select a stage',
    });

  const formattedError =
    (mutation.error && formatAPIError(mutation.error)) || initialStageNullError || null;

  const handleChange = async ({ value: stageId }) => {
    mutation.mutate({
      entityId: initialData.id,
      stageId,
      uid,
    });
  };

  const { themeColorName } = activeWorkflowStage?.color
    ? getStageColorByHex(activeWorkflowStage?.color)
    : {};

  return (
    <Field name={STAGE_ATTRIBUTE_NAME} id={STAGE_ATTRIBUTE_NAME}>
      <Flex direction="column" gap={2} alignItems="stretch">
        <SingleSelect
          error={formattedError}
          name={STAGE_ATTRIBUTE_NAME}
          id={STAGE_ATTRIBUTE_NAME}
          value={activeWorkflowStage?.id}
          onChange={(value) => handleChange({ value })}
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
        <FieldError />
      </Flex>
    </Field>
  );
}
