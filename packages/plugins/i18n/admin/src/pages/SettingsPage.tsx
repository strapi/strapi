import * as React from 'react';

import { Button, ContentLayout, EmptyStateLayout, HeaderLayout, Main } from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  useRBAC,
} from '@strapi/helper-plugin';
import { EmptyDocuments, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { CreateModal } from '../components/CreateModal';
import { DeleteModal } from '../components/DeleteModal';
import { EditModal } from '../components/EditModal';
import { LocaleTable, LocaleTableProps } from '../components/LocaleTable';
import { PERMISSIONS } from '../constants';
import { useLocales } from '../hooks/useLocales';
import { Locale } from '../store/reducers';
import { getTranslation } from '../utils/getTranslation';

const SettingsPage = () => {
  const [isOpenedCreateModal, setIsOpenedCreateModal] = React.useState(false);
  const [localeToDelete, setLocaleToDelete] = React.useState<Locale>();
  const [localeToEdit, setLocaleToEdit] = React.useState<Locale>();
  const { locales } = useLocales();
  const { formatMessage } = useIntl();

  const {
    isLoading,
    allowedActions: { canUpdate, canCreate, canDelete },
  } = useRBAC(PERMISSIONS);

  const handleToggleModalCreate = () => {
    setIsOpenedCreateModal((s) => !s);
  };

  useFocusWhenNavigate();

  // Delete actions
  const closeModalToDelete = () => setLocaleToDelete(undefined);
  const handleDeleteLocale: LocaleTableProps['onDeleteLocale'] = (locale) => {
    setLocaleToDelete(locale);
  };

  // Edit actions
  const closeModalToEdit = () => setLocaleToEdit(undefined);
  const handleEditLocale: LocaleTableProps['onEditLocale'] = (locale) => {
    setLocaleToEdit(locale);
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main tabIndex={-1}>
      <HeaderLayout
        primaryAction={
          <Button
            disabled={!canCreate}
            startIcon={<Plus />}
            onClick={handleToggleModalCreate}
            size="S"
          >
            {formatMessage({
              id: getTranslation('Settings.list.actions.add'),
              defaultMessage: 'Add new locale',
            })}
          </Button>
        }
        title={formatMessage({
          id: getTranslation('plugin.name'),
          defaultMessage: 'Internationalization',
        })}
        subtitle={formatMessage({
          id: getTranslation('Settings.list.description'),
          defaultMessage: 'Configure the settings',
        })}
      />
      <ContentLayout>
        {locales?.length > 0 ? (
          <LocaleTable
            locales={locales}
            canDelete={canDelete}
            canEdit={canUpdate}
            onDeleteLocale={handleDeleteLocale}
            onEditLocale={handleEditLocale}
          />
        ) : (
          <EmptyStateLayout
            icon={<EmptyDocuments width={undefined} height={undefined} />}
            content={formatMessage({
              id: getTranslation('Settings.list.empty.title'),
              defaultMessage: 'There are no locales',
            })}
            action={
              <Button
                disabled={!canCreate}
                variant="secondary"
                startIcon={<Plus />}
                onClick={handleToggleModalCreate}
              >
                {formatMessage({
                  id: getTranslation('Settings.list.actions.add'),
                  defaultMessage: 'Add new locale',
                })}
              </Button>
            }
          />
        )}
      </ContentLayout>

      {isOpenedCreateModal && <CreateModal onClose={handleToggleModalCreate} />}
      {localeToEdit && <EditModal onClose={closeModalToEdit} locale={localeToEdit} />}
      {localeToDelete && (
        <DeleteModal localeToDelete={localeToDelete} onClose={closeModalToDelete} />
      )}
    </Main>
  );
};

const ProtectedSettingsPage = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.read}>
      <SettingsPage />
    </CheckPagePermissions>
  );
};

export { ProtectedSettingsPage, SettingsPage };
