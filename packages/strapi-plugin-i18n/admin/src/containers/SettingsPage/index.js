import React from 'react';
import { useIntl } from 'react-intl';
import { BaselineAlignment, ModalConfirm, EmptyList, ListButton } from 'strapi-helper-plugin';
import { Header, List } from '@buffetjs/custom';
import { Button, Text } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';
import ModalEdit from '../../components/ModalEdit';
import { LocaleRow } from '../../components';
import { useLocales } from '../../hooks';
import { getTrad } from '../../utils';
import useDeleteLocale from '../../hooks/useDeleteLocale';
import useEditLocale from '../../hooks/useEditLocale';

// Fake permissions
const canCreate = true;
const canDelete = true;
const canEdit = true;

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

  const handleDelete = canDelete ? showDeleteModal : undefined;
  const handleEdit = canEdit ? showEditModal : undefined;

  const actions = [
    {
      label: formatMessage({ id: getTrad('Settings.list.actions.add') }),
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
          <EmptyList
            title={formatMessage({ id: getTrad('Settings.list.empty.title') })}
            description={formatMessage({ id: getTrad('Settings.list.empty.description') })}
          />
          <ListButton>
            <Button
              label={formatMessage({ id: getTrad('Settings.list.actions.add') })}
              onClick={() => console.log('Click add locale')}
              color="primary"
              type="button"
              icon={<Plus fill="#007eff" width="11px" height="11px" />}
            />
          </ListButton>
        </>
      )}

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
