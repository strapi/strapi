import * as React from 'react';

import {
  useNotification,
  useAPIErrorHandler,
  useRBAC,
  useAdminUsers,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { Combobox, ComboboxOption, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { useTypedSelector } from '../../../../../modules/hooks';
import { useUpdateAssigneeMutation } from '../../../../../services/content-manager';
import { buildValidParams } from '../../../../../utils/api';
import { getDisplayName } from '../../../../../utils/users';

import { ASSIGNEE_ATTRIBUTE_NAME } from './constants';

const AssigneeSelect = () => {
  const {
    collectionType = '',
    id,
    slug: model = '',
  } = useParams<{ collectionType: string; slug: string; id: string }>();
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();
  const {
    allowedActions: { canRead },
    isLoading: isLoadingPermissions,
  } = useRBAC(permissions.settings?.users);
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const { data, isLoading, isError } = useAdminUsers(undefined, {
    skip: isLoadingPermissions || !canRead,
  });
  const { document } = unstable_useDocument(
    {
      collectionType,
      model,
      documentId: id,
    },
    {
      skip: !id && collectionType !== 'single-types',
    }
  );

  const users = data?.users || [];

  const currentAssignee = document ? document[ASSIGNEE_ATTRIBUTE_NAME] : null;

  const [updateAssignee, { error, isLoading: isMutating }] = useUpdateAssigneeMutation();

  if (!collectionType || !model || !document?.documentId) {
    return null;
  }

  const handleChange = async (assigneeId: string | null) => {
    // a simple way to avoid erroneous updates
    if (currentAssignee?.id === assigneeId) {
      return;
    }

    const res = await updateAssignee({
      slug: collectionType,
      model,
      id: document.documentId,
      params,
      data: {
        id: assigneeId ? parseInt(assigneeId, 10) : null,
      },
    });

    if ('data' in res) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-manager.reviewWorkflows.assignee.notification.saved',
          defaultMessage: 'Assignee updated',
        }),
      });
    }
  };

  return (
    <Field.Root
      name={ASSIGNEE_ATTRIBUTE_NAME}
      id={ASSIGNEE_ATTRIBUTE_NAME}
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
    >
      <Field.Label>
        {formatMessage({
          id: 'content-manager.reviewWorkflows.assignee.label',
          defaultMessage: 'Assignee',
        })}
      </Field.Label>
      <Combobox
        clearLabel={formatMessage({
          id: 'content-manager.reviewWorkflows.assignee.clear',
          defaultMessage: 'Clear assignee',
        })}
        disabled={
          (!isLoadingPermissions && !isLoading && users.length === 0) || !document.documentId
        }
        value={currentAssignee ? currentAssignee.id.toString() : null}
        onChange={handleChange}
        onClear={() => handleChange(null)}
        placeholder={formatMessage({
          id: 'content-manager.reviewWorkflows.assignee.placeholder',
          defaultMessage: 'Select…',
        })}
        loading={isLoading || isLoadingPermissions || isMutating}
      >
        {users.map((user) => {
          return (
            <ComboboxOption
              key={user.id}
              value={user.id.toString()}
              textValue={getDisplayName(user)}
            >
              {getDisplayName(user)}
            </ComboboxOption>
          );
        })}
      </Combobox>
      <Field.Error />
    </Field.Root>
  );
};

export { AssigneeSelect };
