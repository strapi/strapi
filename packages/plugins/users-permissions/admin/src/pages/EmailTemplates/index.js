import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useTracking,
  useNotification,
  useOverlayBlocker,
  CheckPagePermissions,
  useRBAC,
  useFocusWhenNavigate,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Main } from '@strapi/design-system/Main';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import pluginPermissions from '../../permissions';
import { getTrad } from '../../utils';
import { fetchData, putEmailTemplate } from './utils/api';
import EmailTable from './components/EmailTable';
import EmailForm from './components/EmailForm';

const ProtectedEmailTemplatesPage = () => (
  <CheckPagePermissions permissions={pluginPermissions.readEmailTemplates}>
    <EmailTemplatesPage />
  </CheckPagePermissions>
);

const EmailTemplatesPage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const trackUsageRef = useRef(trackUsage);
  const queryClient = useQueryClient();
  useFocusWhenNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);

  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateEmailTemplates };
  }, []);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(updatePermissions);

  const { status: isLoadingData, data } = useQuery('email-templates', () => fetchData(), {
    onSuccess: () => {
      notifyStatus(
        formatMessage({
          id: getTrad('Email.template.data.loaded'),
          defaultMessage: 'Email templates has been loaded',
        })
      );
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occurred' },
      });
    },
  });

  const isLoading = isLoadingForPermissions || isLoadingData !== 'success';

  const handleToggle = () => {
    setIsModalOpen(prev => !prev);
  };

  const handleEditClick = template => {
    setTemplateToEdit(template);
    handleToggle();
  };

  const submitMutation = useMutation(body => putEmailTemplate({ 'email-templates': body }), {
    onSuccess: async () => {
      await queryClient.invalidateQueries('email-templates');

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });

      trackUsageRef.current('didEditEmailTemplates');

      unlockApp();
      handleToggle();
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occurred' },
      });
      unlockApp();
    },
    refetchActive: true,
  });
  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = body => {
    lockApp();
    trackUsageRef.current('willEditEmailTemplates');

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
    <Main aria-busy={isSubmittingForm}>
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
