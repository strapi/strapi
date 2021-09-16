import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import {
  SettingsPageTitle,
  useTracking,
  getYupInnerErrors,
  useNotification,
  useOverlayBlocker,
  CheckPagePermissions,
  useRBAC,
  LoadingIndicatorPage
} from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/parts/LiveRegions';
import { Main } from '@strapi/parts/Main';
import { ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
import CheckIcon from '@strapi/icons/CheckIcon';
import pluginPermissions from '../../permissions';
// import { useForm } from '../../hooks';
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  // const buttonSubmitRef = useRef(null);
  
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
          id: 'Form.advancedSettings.data.loaded',
          defaultMessage: 'Advanced settings data has been loaded',
        })
      );
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  const isLoading = isLoadingForPermissions || isLoadingData !== 'success';

  const handleToggle = () => {
    setIsModalOpen(prev => !prev)
  };

  const handleEditClick = (template) => {
    setTemplateToEdit(data[template]);
    handleToggle();
  };

  const handleSubmit = body => {
    console.log(body)
  }
  console.log(data)
  // console.log(data);

  // const emailTemplates = useMemo(() => {
  //   return Object.keys(modifiedData).reduce((acc, current) => {
  //     const { display, icon } = modifiedData[current];

  //     acc.push({
  //       id: current,
  //       name: formatMessage({ id: getTrad(display) }),
  //       icon: ['fas', icon],
  //     });

  //     return acc;
  //   }, []);
  // }, [modifiedData, formatMessage]);

  // const handleSubmit = useCallback(
  //   async e => {
  //     e.preventDefault();

  //     let errors = {};

  //     try {
  //       setIsSubmiting(true);
  //       await schema.validate(modifiedData[templateToEdit.id], { abortEarly: false });

  //       lockApp();

  //       try {
  //         trackUsageRef.current('willEditEmailTemplates');

  //         await request(getRequestURL('email-templates'), {
  //           method: 'PUT',
  //           body: { 'email-templates': modifiedData },
  //         });

  //         trackUsageRef.current('didEditEmailTemplates');

  //         toggleNotification({
  //           type: 'success',
  //           message: { id: getTrad('notification.success.submit') },
  //         });

  //         dispatchSubmitSucceeded();

  //         handleToggle();
  //       } catch (err) {
  //         console.error(err);

  //         toggleNotification({
  //           type: 'warning',
  //           message: { id: 'notification.error' },
  //         });
  //       }
  //     } catch (err) {
  //       errors = getYupInnerErrors(err);
  //     } finally {
  //       setIsSubmiting(false);
  //       unlockApp();
  //     }

  //     dispatchSetFormErrors(errors);
  //   },
  //   [
  //     dispatchSetFormErrors,
  //     dispatchSubmitSucceeded,
  //     modifiedData,
  //     templateToEdit,
  //     handleToggle,
  //     toggleNotification,
  //     lockApp,
  //     unlockApp,
  //   ]
  // );

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
        <EmailTable onEditClick={handleEditClick} canUpdate={canUpdate}/>
        {isModalOpen &&
          <EmailForm template={templateToEdit} onToggle={handleToggle} onSubmit={handleSubmit}/>
        }
      </ContentLayout>
    </Main>
  );
};

export default ProtectedEmailTemplatesPage;