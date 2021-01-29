import React from 'react';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { Header, List } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';

import { LocaleRow } from '../../components';
import { useLocales } from '../../hooks';
import { getTrad } from '../../utils';

// Fake permissions
const canCreate = true;

const LocaleSettingsPage = () => {
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
        customRowComponent={locale => <LocaleRow locale={locale} />}
      />
    </>
  );
};

export default LocaleSettingsPage;
