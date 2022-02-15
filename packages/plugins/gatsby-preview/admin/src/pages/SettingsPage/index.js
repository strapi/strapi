import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import { Main } from '@strapi/design-system/Main';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';
import {
  useFocusWhenNavigate,
  LoadingIndicatorPage,
  getYupInnerErrors,
  useNotification,
} from '@strapi/helper-plugin';
import EmptyDocuments from '@strapi/icons/EmptyDocuments';
import { useQueries, useMutation, useQueryClient } from 'react-query';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import SettingsList from '../../components/SettingsList';
import { fetchContentTypes, fetchSettings, putSettings } from './utils/api';
import contentSyncSchema from './utils/schema';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [
    { data: contentTypes, isLoading },
    { data: settingsData, isLoading: isLoadingForSettings },
  ] = useQueries([
    { queryKey: `${pluginId}-content-types`, queryFn: fetchContentTypes },
    {
      queryKey: `${pluginId}-settings`,
      queryFn: fetchSettings,
    },
  ]);
  const toggleNotification = useNotification();
  const [shouldDisplaySaveButton, setShouldDisplaySetButton] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const ref = useRef();
  const queryClient = useQueryClient();

  useFocusWhenNavigate();

  const mutation = useMutation(putSettings, {
    onMutate: async body => {
      await queryClient.cancelQueries(`${pluginId}-settings`);

      const previousResponse = queryClient.getQueryData(`${pluginId}-settings`);

      queryClient.setQueryData(`${pluginId}-settings`, old => ({
        ...old,
        contentSyncURL: body.contentSyncURL,
      }));

      return { previousResponse };
    },
    onSuccess: () => {
      toggleNotification({
        type: 'success',
        message: {
          id: getTrad('Settings.save-sucess'),
          defaultMessage: 'Settings have been updated',
        },
      });
    },
  });

  const handleSubmit = async e => {
    e.preventDefault();

    if (ref?.current?.getContentSyncURL) {
      const body = ref.current.getContentSyncURL();

      let errors = {};

      try {
        await contentSyncSchema.validate(body, { abortEarly: false });

        mutation.mutate(body);
        setFormErrors({});
      } catch (err) {
        errors = getYupInnerErrors(err);

        setFormErrors(errors);
      }
    }
  };

  const shouldShowLoader = isLoading || isLoadingForSettings;

  if (shouldShowLoader) {
    return (
      <Main aria-busy="true">
        <LoadingIndicatorPage />
      </Main>
    );
  }

  const primaryAction = shouldDisplaySaveButton ? (
    <Button size="S" type="submit">
      {formatMessage({ id: getTrad('form.button.save'), defaultMessage: 'Save' })}
    </Button>
  ) : null;

  return (
    <Main tabIndex={-1}>
      <form onSubmit={handleSubmit}>
        <HeaderLayout
          primaryAction={primaryAction}
          title={formatMessage({ id: getTrad('Settings.title'), defaultMessage: 'Gatsby' })}
          subtitle={formatMessage({
            id: getTrad('Settings.description'),
            defaultMessage:
              'Preview content changes from your team in you Gatsby Cloud before it gets deployed to production',
          })}
        />
        <ContentLayout>
          {contentTypes.length === 0 ? (
            <EmptyStateLayout
              icon={<EmptyDocuments width={undefined} height={undefined} />}
              content={formatMessage({
                id: getTrad('Settings.list-empty'),
                defaultMessage:
                  "You don't have any content yet, we recommend you to create your first Content-Type.",
              })}
            />
          ) : (
            <SettingsList
              ref={ref}
              contentTypes={contentTypes}
              formErrors={formErrors}
              initialData={settingsData}
              onToggleDisplaySaveButton={setShouldDisplaySetButton}
            />
          )}
        </ContentLayout>
      </form>
    </Main>
  );
};

export default SettingsPage;
