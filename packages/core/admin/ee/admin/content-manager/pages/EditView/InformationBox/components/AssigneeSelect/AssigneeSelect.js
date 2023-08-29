import * as React from 'react';

import { Field, FieldLabel, FieldError, Flex, Loader } from '@strapi/design-system';
import {
  // eslint-disable-next-line no-restricted-imports
  ReactSelect,
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { useAdminUsers } from '../../../../../../../../admin/src/hooks/useAdminUsers';
import { ASSIGNEE_ATTRIBUTE_NAME } from '../../constants';

export function AssigneeSelect() {
  const {
    initialData,
    layout: { uid },
    isSingleType,
    onChange,
  } = useCMEditViewDataManager();
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { put } = useFetchClient();
  const { users, isLoading, isError } = useAdminUsers();

  const currentAssignee = initialData?.[ASSIGNEE_ATTRIBUTE_NAME] ?? null;

  const handleChange = async ({ value: assigneeId }) => {
    mutation.mutate({
      entityId: initialData.id,
      assigneeId,
      uid,
    });
  };

  const mutation = useMutation(
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
            defaultMessage: 'Assignee updated',
          },
        });
      },
    }
  );

  const formattedError =
    (isError &&
      formatMessage({
        id: 'content-manager.reviewWorkflows.assignee.error',
        defaultMessage: 'An error occurred while fetching users',
      })) ||
    (mutation.error && formatAPIError(mutation.error));

  return (
    <Field error={formattedError} name={ASSIGNEE_ATTRIBUTE_NAME} id={ASSIGNEE_ATTRIBUTE_NAME}>
      <Flex direction="column" gap={2} alignItems="stretch">
        <FieldLabel>
          {formatMessage({
            id: 'content-manager.reviewWorkflows.assignee.label',
            defaultMessage: 'Assignee',
          })}
        </FieldLabel>

        <ReactSelect
          components={{
            LoadingIndicator: () => <Loader data-testid="loader" small />,
          }}
          disabled={isError}
          error={formattedError}
          inputId={ASSIGNEE_ATTRIBUTE_NAME}
          isLoading={isLoading || mutation.isLoading}
          isSearchable
          isClearable
          name={ASSIGNEE_ATTRIBUTE_NAME}
          onChange={(selectedOption, triggeredAction) => {
            if (triggeredAction.action === 'clear') {
              handleChange({ value: null });

              return;
            }

            handleChange({ value: selectedOption.value });
          }}
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
  );
}
