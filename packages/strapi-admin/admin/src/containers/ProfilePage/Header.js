import React from 'react';
import { Header as PluginHeader } from '@buffetjs/custom';
import { auth } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';

const Header = () => {
  const { formatMessage } = useIntl();
  const userInfos = auth.getUserInfo();
  const headerProps = {
    actions: [
      {
        onClick: () => {
          console.log('cancel');
        },
        color: 'cancel',
        label: formatMessage({
          id: 'app.components.Button.reset',
        }),
        type: 'button',
        // style: {
        //   paddingLeft: 15,
        //   paddingRight: 15,
        //   fontWeight: 600,
        // },
      },
      {
        color: 'success',
        label: formatMessage({
          id: 'app.components.Button.save',
        }),
        type: 'submit',
        // style: {
        //   minWidth: 150,
        //   fontWeight: 600,
        // },
      },
    ],
    title: {
      label: userInfos.username || `${userInfos.firstname} ${userInfos.lastname}`,
    },
  };

  return <PluginHeader {...headerProps} />;
};

export default Header;
