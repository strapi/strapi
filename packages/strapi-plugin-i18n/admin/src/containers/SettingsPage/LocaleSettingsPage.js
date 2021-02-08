import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import ModalEdit from '../../components/ModalEdit';
import ModalDelete from '../../components/ModalDelete';
import { getTrad } from '../../utils';
import LocaleList from '../../components/LocaleList';

const LocaleSettingsPage = ({
  canReadLocale,
  canCreateLocale,
  canDeleteLocale,
  canUpdateLocale,
}) => {
  const [localeToDelete, setLocaleToDelete] = useState(undefined);
  const [localeToEdit, setLocaleToEdit] = useState(undefined);
  const { formatMessage } = useIntl();

  const closeModalToDelete = () => setLocaleToDelete(undefined);
  const handleDeleteLocale = canDeleteLocale ? setLocaleToDelete : undefined;

  const closeModalToEdit = () => setLocaleToEdit(undefined);
  const handleEditLocale = canUpdateLocale ? setLocaleToEdit : undefined;

  const actions = [
    {
      label: formatMessage({ id: getTrad('Settings.list.actions.add') }),
      onClick: () => console.log('add locale'),
      color: 'primary',
      type: 'button',
      icon: true,
      Component: props => (canCreateLocale ? <Button {...props} /> : null),
      style: {
        paddingLeft: 15,
        paddingRight: 15,
      },
    },
  ];

  return (
    <>
      <Header
        title={{
          label: formatMessage({ id: getTrad('plugin.name') }),
        }}
        content={formatMessage({ id: getTrad('Settings.list.description') })}
        actions={actions}
      />

      <BaselineAlignment top size="3px" />

      {canReadLocale ? (
        <LocaleList
          onAddLocale={() => undefined}
          onDeleteLocale={handleDeleteLocale}
          onEditLocale={handleEditLocale}
        />
      ) : null}

      <ModalDelete localeToDelete={localeToDelete} onClose={closeModalToDelete} />
      <ModalEdit localeToEdit={localeToEdit} onClose={closeModalToEdit} />
    </>
  );
};

LocaleSettingsPage.propTypes = {
  canReadLocale: PropTypes.bool.isRequired,
  canCreateLocale: PropTypes.bool.isRequired,
  canUpdateLocale: PropTypes.bool.isRequired,
  canDeleteLocale: PropTypes.bool.isRequired,
};

export default LocaleSettingsPage;
