import React from 'react';
import { useIntl } from 'react-intl';
import { BaselineAlignment, ModalConfirm } from 'strapi-helper-plugin';
import { Header, List } from '@buffetjs/custom';
import { Button, Text } from '@buffetjs/core';
import ModalEdit from '../../components/ModalEdit';
import { LocaleRow } from '../../components';
import { useLocales } from '../../hooks';
import { getTrad } from '../../utils';
import useDeleteLocale from '../../hooks/useDeleteLocale';
import useEditLocale from '../../hooks/useEditLocale';

// Fake permissions
const canCreate = true;

const LocaleSettingsPage = () => {
  const {
    isDeleting,
    isDeleteModalOpen,
    deleteLocale,
    showDeleteModal,
    hideDeleteModal,
  } = useDeleteLocale();

  const { isEditing, isEditModalOpen, editLocale, showEditModal, hideEditModal } = useEditLocale();

  const { formatMessage } = useIntl();
  const { locales, isLoading } = useLocales();

  const actions = [
    {
      label: 'Add locale',
      onClick: () => console.log('add locale'),
      color: 'primary',
      type: 'button',
      icon: true,
      Component: props => {
        if (canCreate) {
          return <Button {...props} />;
        }

        return null;
      },
      style: {
        paddingLeft: 15,
        paddingRight: 15,
      },
    },
  ];

  const headerProps = {
    title: {
      label: formatMessage({ id: getTrad('plugin.name') }),
    },
    content: formatMessage({ id: getTrad('Settings.list.description') }),
    actions,
  };

  const listTitle = formatMessage(
    {
      id: getTrad(`Settings.locales.list.title${locales.length > 1 ? '.plural' : '.singular'}`),
    },
    { number: locales.length }
  );

  return (
    <>
      <Header {...headerProps} />
      <BaselineAlignment top size="3px" />
      <List
        title={listTitle}
        items={locales}
        isLoading={isLoading}
        customRowComponent={locale => (
          <LocaleRow
            locale={locale}
            onDelete={() => showDeleteModal(locale)}
            onEdit={() => showEditModal(locale)}
          />
        )}
      />

      <ModalConfirm
        confirmButtonLabel={{
          id: getTrad('Settings.locales.modal.delete.confirm'),
        }}
        showButtonLoader={isDeleting}
        isOpen={isDeleteModalOpen}
        toggle={hideDeleteModal}
        onClosed={hideDeleteModal}
        onConfirm={deleteLocale}
        type="warning"
        content={{
          id: getTrad(`Settings.locales.modal.delete.message`),
        }}
      >
        <Text fontWeight="bold">
          {formatMessage({ id: getTrad('Settings.locales.modal.delete.secondMessage') })}
        </Text>
      </ModalConfirm>

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

export default LocaleSettingsPage;
