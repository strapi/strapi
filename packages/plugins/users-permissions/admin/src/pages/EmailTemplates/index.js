import React, { useRef, useState } from 'react';

import { ContentLayout, HeaderLayout, Main, useNotifyAT } from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  SettingsPageTitle,
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
import { fetchData, putEmailTemplate } from './utils/api';

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
  const trackUsageRef = useRef(trackUsage);
  const queryClient = useQueryClient();
  useFocusWhenNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.updateEmailTemplates });

  const { status: isLoadingData, data } = useQuery('email-templates', () => fetchData(), {
    onSuccess() {
      notifyStatus(
        formatMessage({
          id: getTrad('Email.template.data.loaded'),
          defaultMessage: 'Email templates has been loaded',
        })
      );
    },
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  const isLoading = isLoadingForPermissions || isLoadingData !== 'success';

  const handleToggle = () => {
    setIsModalOpen((prev) => !prev);
  };

  const handleEditClick = (template) => {
    setTemplateToEdit(template);
    handleToggle();
  };

  const submitMutation = useMutation((body) => putEmailTemplate({ 'email-templates': body }), {
    async onSuccess() {
      await queryClient.invalidateQueries('email-templates');

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });

      trackUsageRef.current('didEditEmailTemplates');

      unlockApp();
      handleToggle();
    },
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
      unlockApp();
    },
    refetchActive: true,
  });
  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = (body) => {
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
