import * as React from 'react';

import {
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
  Layouts,
} from '@strapi/admin/strapi-admin';
import { EmptyStateLayout } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { CreateLocale } from '../components/CreateLocale';
import { LocaleTable } from '../components/LocaleTable';
import { PERMISSIONS } from '../constants';
import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { data: locales, isLoading: isLoadingLocales, error } = useGetLocalesQuery();
  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate, canCreate, canDelete },
  } = useRBAC(PERMISSIONS);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  const isLoading = isLoadingLocales || isLoadingRBAC;

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
