import React from 'react';
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

import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { OptionColor } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/components/Stages/Stage/components/OptionColor';
import { SingleValueColor } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/components/Stages/Stage/components/SingleValueColor';
import Information from '../../../../../../admin/src/content-manager/pages/EditView/Information';
import { useAdminUsers } from '../../../../../../admin/src/hooks/useAdminUsers';

const STAGE_ATTRIBUTE_NAME = 'strapi_reviewWorkflows_stage';
const ASSIGNEE_ATTRIBUTE_NAME = 'strapi_assignee';

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
  const currentWorkflowStage = initialData?.[STAGE_ATTRIBUTE_NAME] ?? null;
  const currentAssignee = initialData?.[ASSIGNEE_ATTRIBUTE_NAME] ?? null;
  const hasReviewWorkflowsEnabled = Object.prototype.hasOwnProperty.call(
    initialData,
    STAGE_ATTRIBUTE_NAME
  );
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { users, isLoading: usersIsLoading, isError: usersIsError } = useAdminUsers();
  const { workflows, isLoading: workflowIsLoading } = useReviewWorkflows();
  // TODO: this works only as long as we support one workflow
  const workflow = workflows?.[0] ?? null;

  const stageMutation = useMutation(
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

  const assigneeMutation = useMutation(
    async ({ entityId, assigneeId, uid }) => {
      const typeSlug = isSingleType ? 'single-types' : 'collection-types';

      const {
        data: { data: createdEntity },
      } = await put(`/admin/content-manager/${typeSlug}/${uid}/${entityId}/assignee`, {
        data: { id: assigneeId },
      });

      // initialData and modifiedData have to stay in sync, otherwise the entity would be flagged
      // as modified, which is what the boolean flag is for
      onChange(
        {
          target: { name: ASSIGNEE_ATTRIBUTE_NAME, value: createdEntity[ASSIGNEE_ATTRIBUTE_NAME] },
        },
        true
      );

      return createdEntity;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: {
            id: 'content-manager.reviewWorkflows.assignee.notification.saved',
            defaultMessage: 'Success: Assignee updated',
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
    !workflowIsLoading &&
    !isCreatingEntry &&
    formatMessage({
      id: 'content-manager.reviewWorkflows.stage.select.placeholder',
      defaultMessage: 'Select a stage',
    });

  const formattedStageError =
    (stageMutation.error && formatAPIError(stageMutation.error)) || initialStageNullError || null;
  const formattedAssigneeError = assigneeMutation.error && formatAPIError(assigneeMutation.error);

  const handleChangeStage = async ({ value: stageId }) => {
    stageMutation.mutate({
      entityId: initialData.id,
      stageId,
      uid,
    });
  };

  const handleChangeAssignee = async ({ value: assigneeId }) => {
    assigneeMutation.mutate({
      entityId: initialData.id,
      assigneeId,
      uid,
    });
  };

  return (
    <Information.Root>
      <Information.Title />

      {hasReviewWorkflowsEnabled && !isCreatingEntry && (
        <>
          <Field error={formattedStageError} name={STAGE_ATTRIBUTE_NAME} id={STAGE_ATTRIBUTE_NAME}>
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
                error={formattedStageError}
                inputId={STAGE_ATTRIBUTE_NAME}
                isLoading={stageMutation.isLoading}
                isSearchable={false}
                isClearable={false}
                name={STAGE_ATTRIBUTE_NAME}
                onChange={handleChangeStage}
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

          <Field
            error={formattedAssigneeError}
            name={ASSIGNEE_ATTRIBUTE_NAME}
            id={ASSIGNEE_ATTRIBUTE_NAME}
          >
            <Flex direction="column" gap={2} alignItems="stretch">
              <FieldLabel>
                {formatMessage({
                  id: 'content-manager.reviewWorkflows.assignee.label',
                  defaultMessage: 'Assignee',
                })}
              </FieldLabel>

              <ReactSelect
                components={{
                  LoadingIndicator: () => <Loader small />,
                }}
                disabled={usersIsError}
                error={formattedAssigneeError}
                inputId={ASSIGNEE_ATTRIBUTE_NAME}
                isLoading={usersIsLoading || assigneeMutation.isLoading}
                isSearchable
                isClearable
                name={ASSIGNEE_ATTRIBUTE_NAME}
                onChange={handleChangeAssignee}
                onClear={() => handleChangeAssignee({ value: null })}
                options={users.map(({ id, firstname, lastname }) => ({
                  value: id,
                  label: formatMessage(
                    {
                      id: 'content-manager.reviewWorkflows.assignee.name',
                      defaultMessage: '{firstname} {lastname}',
                    },
                    {
                      firstname,
                      lastname,
                    }
                  ),
                }))}
                value={
                  currentAssignee
                    ? {
                        value: currentAssignee.id,
                        label: formatMessage(
                          {
                            id: 'content-manager.reviewWorkflows.assignee.name',
                            defaultMessage: '{firstname} {lastname}',
                          },
                          {
                            firstname: currentAssignee.firstname,
                            lastname: currentAssignee.lastname,
                          }
                        ),
                      }
                    : null
                }
              />

              <FieldError />
            </Flex>
          </Field>
        </>
      )}
      <Information.Body />
    </Information.Root>
  );
}
