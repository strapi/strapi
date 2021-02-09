import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';

import { getTrad } from '../../utils';
import LocaleList from '../../components/LocaleList';

const LocaleSettingsPage = ({
  canReadLocale,
  canCreateLocale,
  canDeleteLocale,
  canUpdateLocale,
}) => {
  const { formatMessage } = useIntl();

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
          canUpdateLocale={canUpdateLocale}
          canDeleteLocale={canDeleteLocale}
          canCreateLocale={canCreateLocale}
        />
      ) : null}
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
