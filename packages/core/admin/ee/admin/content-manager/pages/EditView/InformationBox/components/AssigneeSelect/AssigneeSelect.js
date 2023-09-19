import * as React from 'react';

import { Combobox, ComboboxOption, Field, Flex } from '@strapi/design-system';
import {
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';

import { getDisplayName } from '../../../../../../../../admin/src/content-manager/utils';
import { useAdminUsers } from '../../../../../../../../admin/src/hooks/useAdminUsers';
import { selectAdminPermissions } from '../../../../../../../../admin/src/pages/App/selectors';
import { ASSIGNEE_ATTRIBUTE_NAME } from '../../constants';

export function AssigneeSelect() {
  const {
    initialData,
    layout: { uid },
    isSingleType,
    onChange,
  } = useCMEditViewDataManager();
  const permissions = useSelector(selectAdminPermissions);
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { put } = useFetchClient();
  const {
    allowedActions: { canReadUsers },
    isLoading: isLoadingPermissions,
  } = useRBAC({
    readUsers: permissions.settings.users.read,
  });
  const { users, isLoading, isError } = useAdminUsers(
    {},
    {
      enabled: !isLoadingPermissions && canReadUsers,
    }
  );

  const currentAssignee = initialData?.[ASSIGNEE_ATTRIBUTE_NAME] ?? null;

  const handleChange = async ({ value: assigneeId }) => {
    mutation.mutate({
      entityId: initialData.id,
      assigneeId: parseInt(assigneeId, 10),
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

  return (
    <Field name={ASSIGNEE_ATTRIBUTE_NAME} id={ASSIGNEE_ATTRIBUTE_NAME}>
      <Flex direction="column" gap={2} alignItems="stretch">
        <Combobox
          clearLabel={formatMessage({
            id: 'content-manager.reviewWorkflows.assignee.clear',
            defaultMessage: 'Clear assignee',
          })}
          error={
            (isError &&
              canReadUsers &&
              formatMessage({
                id: 'content-manager.reviewWorkflows.assignee.error',
                defaultMessage: 'An error occurred while fetching users',
              })) ||
            (mutation.error && formatAPIError(mutation.error))
          }
          disabled={!isLoadingPermissions && !isLoading && users.length === 0}
          name={ASSIGNEE_ATTRIBUTE_NAME}
          id={ASSIGNEE_ATTRIBUTE_NAME}
          value={currentAssignee ? currentAssignee.id : null}
          onChange={(value) => handleChange({ value })}
          onClear={() => handleChange({ value: null })}
          placeholder={formatMessage({
            id: 'content-manager.reviewWorkflows.assignee.placeholder',
            defaultMessage: 'Select …',
          })}
          label={formatMessage({
            id: 'content-manager.reviewWorkflows.assignee.label',
            defaultMessage: 'Assignee',
          })}
          loading={isLoading || isLoadingPermissions || mutation.isLoading}
        >
          {users.map((user) => {
            return (
              <ComboboxOption
                key={user.id}
                value={user.id}
                textValue={getDisplayName(user, formatMessage)}
              >
                {getDisplayName(user, formatMessage)}
              </ComboboxOption>
            );
          })}
        </Combobox>
      </Flex>
    </Field>
  );
}
