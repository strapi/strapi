import React, { useState } from 'react';

import { Button, ContentLayout, EmptyStateLayout, HeaderLayout, Main } from '@strapi/design-system';
import { useFocusWhenNavigate } from '@strapi/helper-plugin';
import { EmptyDocuments, Plus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import useLocales from '../../hooks/useLocales';
import { getTrad } from '../../utils';
import ModalCreate from '../ModalCreate';
import ModalDelete from '../ModalDelete';
import ModalEdit from '../ModalEdit';

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
