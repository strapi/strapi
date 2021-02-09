import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { EmptyState, ListButton } from 'strapi-helper-plugin';
import { List, Button } from '@buffetjs/custom';
import { Plus } from '@buffetjs/icons';
import PropTypes from 'prop-types';
import { useLocales } from '../../hooks';
import LocaleRow from '../LocaleRow';
import { getTrad } from '../../utils';
import ModalEdit from '../ModalEdit';
import ModalDelete from '../ModalDelete';

const LocaleList = ({ canUpdateLocale, canDeleteLocale, canCreateLocale }) => {
  const [localeToDelete, setLocaleToDelete] = useState();
  const [localeToEdit, setLocaleToEdit] = useState();
  const { locales, isLoading, refetch } = useLocales();
  const { formatMessage } = useIntl();

  const closeModalToDelete = () => setLocaleToDelete(undefined);
  const handleDeleteLocale = canDeleteLocale ? setLocaleToDelete : undefined;

  const closeModalToEdit = () => {
    refetch();
    setLocaleToEdit(undefined);
  };

  const handleEditLocale = canUpdateLocale ? setLocaleToEdit : undefined;

  if (isLoading || (locales && locales.length > 0)) {
    const listTitle = isLoading
      ? null
      : formatMessage(
          {
            id: getTrad(
              `Settings.locales.list.title${locales.length > 1 ? '.plural' : '.singular'}`
            ),
          },
          { number: locales.length }
        );

    return (
      <>
        <List
          title={listTitle}
          items={locales}
          isLoading={isLoading}
          customRowComponent={locale => (
            <LocaleRow locale={locale} onDelete={handleDeleteLocale} onEdit={handleEditLocale} />
          )}
        />

        <ModalDelete localeToDelete={localeToDelete} onClose={closeModalToDelete} />
        <ModalEdit localeToEdit={localeToEdit} onClose={closeModalToEdit} locales={locales} />
      </>
    );
  }

  return (
    <>
      <EmptyState
        title={formatMessage({ id: getTrad('Settings.list.empty.title') })}
        description={formatMessage({ id: getTrad('Settings.list.empty.description') })}
      />

      {canCreateLocale && (
        <ListButton>
          <Button
            label={formatMessage({ id: getTrad('Settings.list.actions.add') })}
            onClick={() => undefined}
            color="primary"
            type="button"
            icon={<Plus fill="#007eff" width="11px" height="11px" />}
          />
        </ListButton>
      )}
    </>
  );
};

LocaleList.propTypes = {
  canUpdateLocale: PropTypes.bool.isRequired,
  canDeleteLocale: PropTypes.bool.isRequired,
  canCreateLocale: PropTypes.bool.isRequired,
};

export default LocaleList;
