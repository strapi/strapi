import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system/Button';
import { Main } from '@strapi/design-system/Main';
import { ContentLayout, EmptyStateLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { useFocusWhenNavigate } from '@strapi/helper-plugin';
import Plus from '@strapi/icons/Plus';
import EmptyDocuments from '@strapi/icons/EmptyDocuments';
import useLocales from '../../hooks/useLocales';
import { getTrad } from '../../utils';
import ModalEdit from '../ModalEdit';
import ModalDelete from '../ModalDelete';
import ModalCreate from '../ModalCreate';
import LocaleTable from './LocaleTable';

const LocaleList = ({ canUpdateLocale, canDeleteLocale, onToggleCreateModal, isCreating }) => {
  const [localeToDelete, setLocaleToDelete] = useState();
  const [localeToEdit, setLocaleToEdit] = useState();
  const { locales } = useLocales();
  const { formatMessage } = useIntl();

  useFocusWhenNavigate();

  // Delete actions
  const closeModalToDelete = () => setLocaleToDelete(undefined);
  const handleDeleteLocale = canDeleteLocale ? setLocaleToDelete : undefined;

  // Edit actions
  const closeModalToEdit = () => setLocaleToEdit(undefined);
  const handleEditLocale = canUpdateLocale ? setLocaleToEdit : undefined;

  return (
    <Main tabIndex={-1}>
      <HeaderLayout
        primaryAction={
          <Button startIcon={<Plus />} onClick={onToggleCreateModal} size="S">
            {formatMessage({ id: getTrad('Settings.list.actions.add') })}
          </Button>
        }
        title={formatMessage({ id: getTrad('plugin.name') })}
        subtitle={formatMessage({ id: getTrad('Settings.list.description') })}
      />
      <ContentLayout>
        {locales?.length > 0 ? (
          <LocaleTable
            locales={locales}
            onDeleteLocale={handleDeleteLocale}
            onEditLocale={handleEditLocale}
          />
        ) : (
          <EmptyStateLayout
            icon={<EmptyDocuments width={undefined} height={undefined} />}
            content={formatMessage({ id: getTrad('Settings.list.empty.title') })}
            action={
              onToggleCreateModal ? (
                <Button variant="secondary" startIcon={<Plus />} onClick={onToggleCreateModal}>
                  {formatMessage({ id: getTrad('Settings.list.actions.add') })}
                </Button>
              ) : null
            }
          />
        )}
      </ContentLayout>

      {isCreating && <ModalCreate onClose={onToggleCreateModal} />}
      {localeToEdit && <ModalEdit onClose={closeModalToEdit} locale={localeToEdit} />}
      <ModalDelete localeToDelete={localeToDelete} onClose={closeModalToDelete} />
    </Main>
  );
};

LocaleList.defaultProps = {
  onToggleCreateModal: undefined,
};

LocaleList.propTypes = {
  canUpdateLocale: PropTypes.bool.isRequired,
  canDeleteLocale: PropTypes.bool.isRequired,
  onToggleCreateModal: PropTypes.func,
  isCreating: PropTypes.bool.isRequired,
};

export default LocaleList;
