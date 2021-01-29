import React from 'react';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { Header, List } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import { Button, Text, IconLinks } from '@buffetjs/core';
import { CustomRow } from '@buffetjs/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useLocales } from '../../hooks';
import { getTrad } from '../../utils';

const canUpdate = true;
const canCreate = true;
const canDelete = true;
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

  return (
    <>
      <Header {...headerProps} />
      <BaselineAlignment top size="3px" />
      <List
        title={formatMessage(
          {
            id: getTrad(
              `Settings.locales.list.title${locales.length > 1 ? '.plural' : '.singular'}`
            ),
          },
          { number: locales.length }
        )}
        items={locales}
        isLoading={isLoading}
        customRowComponent={locale => (
          <CustomRow onClick={() => console.log('open modal')}>
            <td>
              <Text>{locale.code}</Text>
            </td>
            <td>
              <Text fontWeight="semiBold">{locale.displayName}</Text>
            </td>
            <td>
              <Text ellipsis>
                {locale.isDefault
                  ? formatMessage({ id: getTrad('Settings.locales.row.default-locale') })
                  : null}
              </Text>
            </td>
            <td>
              <IconLinks
                links={[
                  {
                    icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                    onClick: () => console.log('edit'),
                  },
                  {
                    icon:
                      canDelete && !locale.isDefault ? <FontAwesomeIcon icon="trash-alt" /> : null,
                    onClick: () => console.log('open delete modal'),
                  },
                ]}
              />
            </td>
          </CustomRow>
        )}
      />
    </>
  );
};

export default LocaleSettingsPage;
