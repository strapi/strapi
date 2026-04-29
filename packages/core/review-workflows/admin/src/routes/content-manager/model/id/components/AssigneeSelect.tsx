import * as React from 'react';

import {
  useNotification,
  useAPIErrorHandler,
  useRBAC,
  useAdminUsers,
  useQueryParams,
  useDebounce,
} from '@strapi/admin/strapi-admin';
import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { Combobox, ComboboxOption, Field, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { useTypedSelector } from '../../../../../modules/hooks';
import { useUpdateAssigneeMutation } from '../../../../../services/content-manager';
import { buildValidParams } from '../../../../../utils/api';
import { getDisplayName } from '../../../../../utils/users';

import { ASSIGNEE_ATTRIBUTE_NAME } from './constants';

const PAGE_SIZE = 10;

const AssigneeSelect = ({ isCompact }: { isCompact?: boolean }) => {
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

  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    data,
    isLoading: isLoadingUsers,
    isError,
  } = useAdminUsers(
    { pageSize, _q: debouncedSearch },
    {
      skip: isLoadingPermissions || !canRead,
    }
  );
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

  const users = React.useMemo(() => data?.users ?? [], [data?.users]);
  const { pageCount = 1, page = 1 } = data?.pagination ?? {};

  const currentAssignee = document ? document[ASSIGNEE_ATTRIBUTE_NAME] : null;

  // Keep the currently assigned user in the options even when they fall outside
  // the loaded page or the active search — otherwise the Combobox loses its value.
  const options = React.useMemo(() => {
    if (!currentAssignee) return users;
    return users.some((u) => u.id === currentAssignee.id) ? users : [currentAssignee, ...users];
  }, [users, currentAssignee]);

  const handleOpenChange = (isOpen?: boolean) => {
    if (!isOpen) {
      setPageSize(PAGE_SIZE);
      setSearch('');
    }
  };

  const handleLoadMore = () => {
    setPageSize(pageSize + PAGE_SIZE);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
  };

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

    if (isCompact && 'error' in res) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(res.error),
      });
    }
  };

  const isDisabled =
    (!isLoadingPermissions && !isLoadingUsers && users.length === 0) || !document.documentId;
  const isLoading = isLoadingUsers || isLoadingPermissions || isMutating;
  const hasMoreItems = page < pageCount;

  const assigneeLabel = formatMessage({
    id: 'content-manager.reviewWorkflows.assignee.label',
    defaultMessage: 'Assignee',
  });
  const assigneeClearLabel = formatMessage({
    id: 'content-manager.reviewWorkflows.assignee.clear',
    defaultMessage: 'Clear assignee',
  });
  const assigneePlaceholder = formatMessage({
    id: 'content-manager.reviewWorkflows.assignee.placeholder',
    defaultMessage: 'Select…',
  });

  if (isCompact) {
    return (
      <Field.Root name={ASSIGNEE_ATTRIBUTE_NAME} id={ASSIGNEE_ATTRIBUTE_NAME}>
        <VisuallyHidden>
          <Field.Label>{assigneeLabel}</Field.Label>
        </VisuallyHidden>
        <Combobox
          clearLabel={assigneeClearLabel}
          disabled={isDisabled}
          value={currentAssignee ? currentAssignee.id.toString() : null}
          onChange={handleChange}
          onClear={() => handleChange(null)}
          onOpenChange={handleOpenChange}
          onLoadMore={handleLoadMore}
          hasMoreItems={hasMoreItems}
          onInputChange={handleInputChange}
          placeholder={assigneePlaceholder}
          loading={isLoading || isLoadingPermissions || isMutating}
          size="S"
        >
          {options.map((user) => {
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
      </Field.Root>
    );
  }

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
      <Field.Label>{assigneeLabel}</Field.Label>
      <Combobox
        clearLabel={assigneeClearLabel}
        disabled={
          (!isLoadingPermissions && !isLoading && users.length === 0) || !document.documentId
        }
        value={currentAssignee ? currentAssignee.id.toString() : null}
        onChange={handleChange}
        onClear={() => handleChange(null)}
        onOpenChange={handleOpenChange}
        onLoadMore={handleLoadMore}
        hasMoreItems={hasMoreItems}
        onInputChange={handleInputChange}
        placeholder={assigneePlaceholder}
        loading={isLoading || isLoadingPermissions || isMutating}
      >
        {options.map((user) => {
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
