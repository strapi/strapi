import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { EmptyState, ListButton } from 'strapi-helper-plugin';
import { List } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';
import PropTypes from 'prop-types';
import useLocales from '../../hooks/useLocales';
import LocaleRow from '../LocaleRow';
import { getTrad } from '../../utils';
import ModalEdit from '../ModalEdit';
import ModalDelete from '../ModalDelete';
import ModalCreate from '../ModalCreate';

const LocaleList = ({ canUpdateLocale, canDeleteLocale, onToggleCreateModal, isCreating }) => {
  const [localeToDelete, setLocaleToDelete] = useState();
  const [localeToEdit, setLocaleToEdit] = useState();
  const { locales, isLoading } = useLocales();
  const { formatMessage } = useIntl();

  // Delete actions
  const closeModalToDelete = () => setLocaleToDelete(undefined);
  const handleDeleteLocale = canDeleteLocale ? setLocaleToDelete : undefined;

  // Edit actions
  const closeModalToEdit = () => {
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
          radius="2px"
          title={listTitle}
          items={locales}
          isLoading={isLoading}
          customRowComponent={locale => (
            <LocaleRow locale={locale} onDelete={handleDeleteLocale} onEdit={handleEditLocale} />
          )}
        />

        <ModalCreate
          isOpened={isCreating}
          onClose={onToggleCreateModal}
          alreadyUsedLocales={locales}
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

      {onToggleCreateModal && (
        <ListButton>
          <Button
            label={formatMessage({ id: getTrad('Settings.list.actions.add') })}
            onClick={onToggleCreateModal}
            color="primary"
            type="button"
            icon={<Plus fill="#007eff" width="11px" height="11px" />}
          />
        </ListButton>
      )}

      <ModalCreate isOpened={isCreating} onClose={onToggleCreateModal} />
    </>
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
