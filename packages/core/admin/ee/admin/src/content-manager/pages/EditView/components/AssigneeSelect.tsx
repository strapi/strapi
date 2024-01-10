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

import { getDisplayName } from '../../../../../../../admin/src/content-manager/utils/users';
import { useTypedSelector } from '../../../../../../../admin/src/core/store/hooks';
import { useAdminUsers } from '../../../../../../../admin/src/hooks/useAdminUsers';

import { ASSIGNEE_ATTRIBUTE_NAME } from './constants';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { AxiosError, AxiosResponse } from 'axios';

const AssigneeSelect = () => {
  const { initialData, layout, isSingleType, onChange } = useCMEditViewDataManager();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { put } = useFetchClient();
  const {
    allowedActions: { canRead },
    isLoading: isLoadingPermissions,
  } = useRBAC(permissions.settings?.users);
  const { users, isLoading, isError } = useAdminUsers(
    {},
    {
      enabled: !isLoadingPermissions && canRead,
    }
  );

  const currentAssignee = initialData?.[ASSIGNEE_ATTRIBUTE_NAME] ?? null;

  const handleChange = async (assigneeId: string | null) => {
    mutation.mutate({
      entityId: initialData.id!,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      uid: layout!.uid,
    });
  };

  const mutation = useMutation<
    Contracts.ReviewWorkflows.UpdateAssignee.Response['data'],
    AxiosError<Required<Pick<Contracts.ReviewWorkflows.UpdateAssignee.Response, 'error'>>>,
    {
      assigneeId: Contracts.ReviewWorkflows.UpdateAssignee.Request['body']['data']['id'];
      uid: Contracts.ReviewWorkflows.UpdateAssignee.Params['model'];
      entityId: Contracts.ReviewWorkflows.UpdateAssignee.Params['id'];
    }
  >(
    async ({ entityId, assigneeId, uid }) => {
      const typeSlug = isSingleType ? 'single-types' : 'collection-types';

      const {
        data: { data: createdEntity },
      } = await put<
        Contracts.ReviewWorkflows.UpdateAssignee.Response,
        AxiosResponse<Contracts.ReviewWorkflows.UpdateAssignee.Response>,
        Contracts.ReviewWorkflows.UpdateAssignee.Request['body']
      >(`/admin/content-manager/${typeSlug}/${uid}/${entityId}/assignee`, {
        data: { id: assigneeId },
      });

      // initialData and modifiedData have to stay in sync, otherwise the entity would be flagged
      // as modified, which is what the boolean flag is for
      onChange?.(
        {
          target: {
            type: '',
            name: ASSIGNEE_ATTRIBUTE_NAME,
            value: createdEntity[ASSIGNEE_ATTRIBUTE_NAME],
          },
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
            ((isError &&
              canRead &&
              formatMessage({
                id: 'content-manager.reviewWorkflows.assignee.error',
                defaultMessage: 'An error occurred while fetching users',
              })) ||
              (mutation.error && formatAPIError(mutation.error))) ??
            undefined
          }
          disabled={!isLoadingPermissions && !isLoading && users.length === 0}
          name={ASSIGNEE_ATTRIBUTE_NAME}
          id={ASSIGNEE_ATTRIBUTE_NAME}
          value={currentAssignee ? currentAssignee.id.toString() : null}
          // @ts-expect-error - DS Combobox wants to return number or string, this will be fixed in V2.
          onChange={handleChange}
          onClear={() => handleChange(null)}
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
                value={user.id.toString()}
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
};

export { AssigneeSelect };
