import React from 'react';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';

const ListPage = () => {
  // TODO when API ready
  const usersCount = 1;
  const { formatMessage } = useGlobalContext();
  const tradBaseId = 'Settings.permissions.users.listview.';
  const headerDescriptionSuffix =
    usersCount > 1 ? 'header.description.plural' : 'header.description.singular';
  const headerProps = {
    actions: [
      {
        label: formatMessage({ id: 'app.utils.delete' }),
        color: 'delete',
        type: 'button',
        disabled: true,
      },

      {
        label: formatMessage({ id: `${tradBaseId}button-create` }),
        color: 'primary',
        type: 'button',
        icon: true,
      },
    ],
    content: formatMessage(
      { id: `${tradBaseId}${headerDescriptionSuffix}` },
      { number: usersCount }
    ),
    title: { label: formatMessage({ id: `${tradBaseId}header.title` }) },
  };

  return (
    <div>
      <Header {...headerProps} />
    </div>
  );
};

export default ListPage;
