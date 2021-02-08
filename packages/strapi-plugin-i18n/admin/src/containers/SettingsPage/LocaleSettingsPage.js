import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { BaselineAlignment, EmptyState, ListButton } from 'strapi-helper-plugin';
import { Header, List } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';
import ModalEdit from '../../components/ModalEdit';
import ModalDelete from '../../components/ModalDelete';
import { LocaleRow } from '../../components';
import { useLocales } from '../../hooks';
import { getTrad } from '../../utils';
import useEditLocale from '../../hooks/useEditLocale';

const LocaleSettingsPage = ({ canCreateLocale, canDeleteLocale, canUpdateLocale }) => {
  const [localeToDelete, setLocaleToDelete] = useState(undefined);

  const { isEditing, isEditModalOpen, editLocale, showEditModal, hideEditModal } = useEditLocale();
  const { formatMessage } = useIntl();
  const { locales, isLoading } = useLocales();

  const closeModalToDelete = () => setLocaleToDelete(undefined);
  const handleDelete = canDeleteLocale ? setLocaleToDelete : undefined;

  const handleEdit = canUpdateLocale ? showEditModal : undefined;

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

  const listTitle = isLoading
    ? null
    : formatMessage(
        {
          id: getTrad(`Settings.locales.list.title${locales.length > 1 ? '.plural' : '.singular'}`),
        },
        { number: locales.length }
      );

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

      {isLoading || (locales && locales.length > 0) ? (
        <List
          title={listTitle}
          items={locales}
          isLoading={isLoading}
          customRowComponent={locale => (
            <LocaleRow locale={locale} onDelete={handleDelete} onEdit={handleEdit} />
          )}
        />
      ) : (
        <>
          <EmptyState
            title={formatMessage({ id: getTrad('Settings.list.empty.title') })}
            description={formatMessage({ id: getTrad('Settings.list.empty.description') })}
          />
          {canCreateLocale && (
            <ListButton>
              <Button
                label={formatMessage({ id: getTrad('Settings.list.actions.add') })}
                onClick={() => console.log('Click add locale')}
                color="primary"
                type="button"
                icon={<Plus fill="#007eff" width="11px" height="11px" />}
              />
            </ListButton>
          )}
        </>
      )}

      <ModalDelete localeToDelete={localeToDelete} onClose={closeModalToDelete} />

      <ModalEdit
        isLoading={isEditing}
        isOpen={isEditModalOpen}
        onCancel={hideEditModal}
        onClosed={hideEditModal}
        onClick={editLocale}
        onOpened={() => null}
        onToggle={hideEditModal}
      />
    </>
  );
};

LocaleSettingsPage.propTypes = {
  canCreateLocale: PropTypes.bool.isRequired,
  canUpdateLocale: PropTypes.bool.isRequired,
  canDeleteLocale: PropTypes.bool.isRequired,
};

export default LocaleSettingsPage;
