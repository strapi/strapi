import * as React from 'react';

import { ContentLayout, HeaderLayout, Main, useNotifyAT } from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { PERMISSIONS } from '../../constants';
import { getTrad } from '../../utils';

import EmailForm from './components/EmailForm';
import EmailTable from './components/EmailTable';

const ProtectedEmailTemplatesPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.readEmailTemplates}>
    <EmailTemplatesPage />
  </CheckPagePermissions>
);

const EmailTemplatesPage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const queryClient = useQueryClient();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  useFocusWhenNavigate();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [templateToEdit, setTemplateToEdit] = React.useState(null);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.updateEmailTemplates });

  const { isLoading: isLoadingData, data } = useQuery(
    ['users-permissions', 'email-templates'],
    async () => {
      const { data } = await get('/users-permissions/email-templates');

      return data;
    },
    {
      onSuccess() {
        notifyStatus(
          formatMessage({
            id: getTrad('Email.template.data.loaded'),
            defaultMessage: 'Email templates has been loaded',
          })
        );
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const isLoading = isLoadingForPermissions || isLoadingData;

  const handleToggle = () => {
    setIsModalOpen((prev) => !prev);
  };

  const handleEditClick = (template) => {
    setTemplateToEdit(template);
    handleToggle();
  };

  const submitMutation = useMutation(
    (body) => put('/users-permissions/email-templates', { 'email-templates': body }),
    {
      async onSuccess() {
        await queryClient.invalidateQueries(['users-permissions', 'email-templates']);

        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
        });

        trackUsage('didEditEmailTemplates');

        unlockApp();
        handleToggle();
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });

        unlockApp();
      },
      refetchActive: true,
    }
  );

  const handleSubmit = (body) => {
    lockApp();

    trackUsage('willEditEmailTemplates');

    const editedTemplates = { ...data, [templateToEdit]: body };
    submitMutation.mutate(editedTemplates);
  };

  if (isLoading) {
    return (
      <Main aria-busy="true">
        <SettingsPageTitle
          name={formatMessage({
            id: getTrad('HeaderNav.link.emailTemplates'),
            defaultMessage: 'Email templates',
          })}
        />
        <HeaderLayout
          title={formatMessage({
            id: getTrad('HeaderNav.link.emailTemplates'),
            defaultMessage: 'Email templates',
          })}
        />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  return (
    <Main aria-busy={submitMutation.isLoading}>
      <SettingsPageTitle
        name={formatMessage({
          id: getTrad('HeaderNav.link.emailTemplates'),
          defaultMessage: 'Email templates',
        })}
      />
      <HeaderLayout
        title={formatMessage({
          id: getTrad('HeaderNav.link.emailTemplates'),
          defaultMessage: 'Email templates',
        })}
      />
      <ContentLayout>
        <EmailTable onEditClick={handleEditClick} canUpdate={canUpdate} />
        {isModalOpen && (
          <EmailForm
            template={data[templateToEdit]}
            onToggle={handleToggle}
            onSubmit={handleSubmit}
          />
        )}
      </ContentLayout>
    </Main>
  );
};

export default ProtectedEmailTemplatesPage;
