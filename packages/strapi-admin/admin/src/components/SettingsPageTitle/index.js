import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import PageTitle from '../PageTitle';

const SettingsPageTitle = ({ name }) => {
  const { formatMessage } = useIntl();
  const text = formatMessage({ id: 'Settings.PageTitle' }, { name });

  return <PageTitle title={text} />;
};

SettingsPageTitle.propTypes = {
  name: PropTypes.string.isRequired,
};

export default SettingsPageTitle;
