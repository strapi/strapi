import * as React from 'react';

import { Main } from '@strapi/design-system';
import { useAPIErrorHandler, Page, useNotification } from '@strapi/strapi/admin';
import { FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';

import { SettingsForm } from '../components/SettingsForm';
import { useGetInfoQuery, useUpdateSettingsMutation } from '../services/api';
import { getTrad, isBaseQueryError } from '../utils';

import type { SettingsInput } from '../types';

const SettingsPage = () => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const { data, isError, isLoading, isFetching } = useGetInfoQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const onUpdateSettings = async (body: SettingsInput, formik: FormikHelpers<SettingsInput>) => {
    return updateSettings({ body })
      .unwrap()
      .then(() => {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: getTrad('notification.update.success'),
            defaultMessage: 'Successfully updated settings',
          }),
        });
      })
      .catch((err) => {
        if (isBaseQueryError(err) && err.name === 'ValidationError') {
          toggleNotification({
            type: 'danger',
            message: formatAPIError(err),
          });
        }
      });
  };

  if (isLoading || isFetching) {
    return <Page.Loading />;
  }

  if (isError) {
    return <Page.Error />;
  }

  return (
    <Main>
      <SettingsForm data={data} onSubmit={onUpdateSettings} />
    </Main>
  );
};

export { SettingsPage };
