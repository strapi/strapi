import * as React from 'react';

import { SerializedError } from '@reduxjs/toolkit';
import {
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
  Layouts,
  BaseQueryError,
} from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import {
  Box,
  EmptyStateLayout,
  Field,
  Flex,
  Tooltip,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { Sparkle } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { CreateLocale } from '../components/CreateLocale';
import { LocaleTable } from '../components/LocaleTable';
import { PERMISSIONS } from '../constants';
import { useGetLocalesQuery } from '../services/locales';
import { useGetSettingsQuery, useUpdatei18nSettingsMutation } from '../services/settings';
import { getTranslation } from '../utils/getTranslation';

const SettingsErrrorTooltip = ({
  children,
  error,
}: {
  children: React.ReactNode;
  error: BaseQueryError | SerializedError | undefined;
}) => {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  if (error) {
    return (
      <Tooltip label={formatAPIError(error)} style={{ maxWidth: '200px' }}>
        {children}
      </Tooltip>
    );
  }

  return children;
};

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { data: locales, isLoading: isLoadingLocales, error } = useGetLocalesQuery();
  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate, canCreate, canDelete },
  } = useRBAC(PERMISSIONS);
  const isAIAvailable = useAIAvailability();

  // Settings state management
  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useGetSettingsQuery();
  const [updateSettings] = useUpdatei18nSettingsMutation();

  const handleToggleChange = async (checked: boolean) => {
    try {
      await updateSettings({ aiLocalizations: checked }).unwrap();

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.form.success.fields' }),
      });
    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
      });
    }
  };

  const isLoading = isLoadingLocales || isLoadingRBAC || isLoadingSettings;

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error || !Array.isArray(locales)) {
    return <Page.Error />;
  }

  return (
    <Page.Main tabIndex={-1}>
      <Layouts.Header
        primaryAction={<CreateLocale disabled={!canCreate} />}
        title={formatMessage({
          id: getTranslation('plugin.name'),
          defaultMessage: 'Internationalization',
        })}
        subtitle={formatMessage({
          id: getTranslation('Settings.list.description'),
          defaultMessage: 'Configure the settings',
        })}
      />
      <Layouts.Content>
        {isAIAvailable && (
          <Flex background="neutral0" padding={6} marginBottom={6} shadow="filterShadow" hasRadius>
            <Flex direction="column" alignItems="stretch" gap={1} flex={1}>
              <Flex gap={1}>
                <Box color="alternative700">
                  <Sparkle />
                </Box>
                <Typography variant="delta" tag="h2">
                  {formatMessage({
                    id: getTranslation('Settings.aiLocalizations.label'),
                    defaultMessage: 'AI Translations',
                  })}
                </Typography>
              </Flex>
              <Typography variant="pi" textColor="neutral600" fontSize="14px">
                {formatMessage({
                  id: getTranslation('Settings.aiLocalizations.description'),
                  defaultMessage:
                    'Everytime you save in the Content Manager, our AI will use your default locale to translate all other locales automatically.',
                })}
              </Typography>
            </Flex>
            <Field.Root name="aiLocalizations" minWidth="200px">
              <SettingsErrrorTooltip error={settingsError}>
                <Toggle
                  disabled={Boolean(settingsError)}
                  checked={settings?.data?.aiLocalizations ?? false}
                  offLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.disabled-label',
                    defaultMessage: 'Disabled',
                  })}
                  onLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.enabled-label',
                    defaultMessage: 'Enabled',
                  })}
                  onChange={(e) => handleToggleChange(e.target.checked)}
                />
              </SettingsErrrorTooltip>
            </Field.Root>
          </Flex>
        )}
        {locales.length > 0 ? (
          <LocaleTable locales={locales} canDelete={canDelete} canUpdate={canUpdate} />
        ) : (
          <EmptyStateLayout
            icon={<EmptyDocuments width={undefined} height={undefined} />}
            content={formatMessage({
              id: getTranslation('Settings.list.empty.title'),
              defaultMessage: 'There are no locales',
            })}
            action={<CreateLocale disabled={!canCreate} variant="secondary" />}
          />
        )}
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedSettingsPage = () => {
  return (
    <Page.Protect permissions={PERMISSIONS.read}>
      <SettingsPage />
    </Page.Protect>
  );
};

export { ProtectedSettingsPage, SettingsPage };
