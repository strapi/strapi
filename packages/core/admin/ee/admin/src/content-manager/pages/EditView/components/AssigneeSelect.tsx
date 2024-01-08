import { Combobox, ComboboxOption, Field, Flex } from '@strapi/design-system';
import {
  useCMEditViewDataManager,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../../../../admin/src/content-manager/utils/users';
import { useTypedSelector } from '../../../../../../../admin/src/core/store/hooks';
import { useAdminUsers } from '../../../../../../../admin/src/services/users';
import { useUpdateAssigneeMutation } from '../../../../services/reviewWorkflows';

import { ASSIGNEE_ATTRIBUTE_NAME } from './constants';

const AssigneeSelect = () => {
  const { initialData, layout, isSingleType, onChange } = useCMEditViewDataManager();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const {
    allowedActions: { canRead },
    isLoading: isLoadingPermissions,
  } = useRBAC(permissions.settings?.users);
  const { data, isLoading, isError } = useAdminUsers(
    {},
    {
      skip: isLoadingPermissions || !canRead,
    }
  );

  const users = data?.users || [];

  const currentAssignee = initialData?.[ASSIGNEE_ATTRIBUTE_NAME] ?? null;

  const [updateAssignee, { error, isLoading: isMutating }] = useUpdateAssigneeMutation();

  const handleChange = async (assigneeId: string | null) => {
    const res = await updateAssignee({
      slug: isSingleType ? 'single-types' : 'collection-types',
      model: layout!.uid,
      id: initialData.id!,
      data: {
        id: assigneeId ? parseInt(assigneeId, 10) : null,
      },
    });

    if ('data' in res) {
      // initialData and modifiedData have to stay in sync, otherwise the entity would be flagged
      // as modified, which is what the boolean flag is for
      onChange?.(
        {
          target: {
            type: '',
            name: ASSIGNEE_ATTRIBUTE_NAME,
            value: res.data[ASSIGNEE_ATTRIBUTE_NAME],
          },
        },
        true
      );

      toggleNotification({
        type: 'success',
        message: {
          id: 'content-manager.reviewWorkflows.assignee.notification.saved',
          defaultMessage: 'Assignee updated',
        },
      });
    }
  };

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
              (error && formatAPIError(error))) ??
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
          loading={isLoading || isLoadingPermissions || isMutating}
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
