import * as React from 'react';
import {
  ReactSelect,
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { Field, FieldLabel, FieldError, Flex, Loader } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { useReviewWorkflows } from '../../../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { OptionColor } from '../../../../../../pages/SettingsPage/pages/ReviewWorkflows/components/Stages/Stage/components/OptionColor';
import { SingleValueColor } from '../../../../../../pages/SettingsPage/pages/ReviewWorkflows/components/Stages/Stage/components/SingleValueColor';
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

  return (
    <Field error={formattedError} name={STAGE_ATTRIBUTE_NAME} id={STAGE_ATTRIBUTE_NAME}>
      <Flex direction="column" gap={2} alignItems="stretch">
        <FieldLabel>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.stage.label',
            defaultMessage: 'Review stage',
          })}
        </FieldLabel>

        <ReactSelect
          components={{
            LoadingIndicator: () => <Loader small />,
            Option: OptionColor,
            SingleValue: SingleValueColor,
          }}
          error={formattedError}
          inputId={STAGE_ATTRIBUTE_NAME}
          isLoading={mutation.isLoading}
          isSearchable={false}
          isClearable={false}
          name={STAGE_ATTRIBUTE_NAME}
          onChange={handleChange}
          options={
            workflow
              ? workflow.stages.map(({ id, color, name }) => ({
                  value: id,
                  label: name,
                  color,
                }))
              : []
          }
          value={{
            value: currentWorkflowStage?.id,
            label: currentWorkflowStage?.name,
            color: currentWorkflowStage?.color,
          }}
        />

        <FieldError />
      </Flex>
    </Field>
  );
}
