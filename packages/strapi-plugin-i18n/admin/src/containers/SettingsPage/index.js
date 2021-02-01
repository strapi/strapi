import React from 'react';
import { useIntl } from 'react-intl';
import { ListButton, SettingsPageLayout } from 'strapi-helper-plugin';
import { Plus } from '@buffetjs/icons';
import { List } from '@buffetjs/custom';
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

  const listTitle = formatMessage(
    {
      id: getTrad(`Settings.locales.list.title${locales.length > 1 ? '.plural' : '.singular'}`),
    },
    { number: locales.length }
  );

  return (
    <SettingsPageLayout
      pageTitle="Hello moto"
      header={{
        title: {
          label: formatMessage({ id: getTrad('plugin.name') }),
        },
        content: formatMessage({ id: getTrad('Settings.list.description') }),
        actions,
      }}
      Content={(
        <>
          <List
            title={listTitle}
            items={locales}
            isLoading={isLoading}
            customRowComponent={locale => <LocaleRow locale={locale} />}
          />

          <ListButton>
            {canCreate && (
              <Button
                label="Add locale"
                onClick={() => undefined}
                color="primary"
                type="button"
                icon={<Plus fill="#007eff" width="11px" height="11px" />}
              />
            )}
          </ListButton>
        </>
      )}
    />
  );
};

export default LocaleSettingsPage;
