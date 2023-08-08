import React from 'react';

import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';

const SettingsPageTitle = ({ name }) => {
  const { formatMessage } = useIntl();
  const text = formatMessage(
    { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
    { name }
  );

  return <Helmet title={text} />;
};

SettingsPageTitle.propTypes = {
  name: PropTypes.string.isRequired,
};

export { SettingsPageTitle };
