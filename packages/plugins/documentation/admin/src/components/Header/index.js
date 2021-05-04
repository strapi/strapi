import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Header as Base } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { CheckPermissions } from '@strapi/helper-plugin';
import openWithNewTab from '../../utils/openWithNewTab';
import pluginPermissions from '../../permissions';
import getTrad from '../../utils/getTrad';

const Header = ({ currentDocVersion, docPrefixURL }) => {
  const { formatMessage } = useIntl();
  const headerActions = [
    {
      color: 'none',
      label: formatMessage({
        id: getTrad('containers.HomePage.Button.open'),
        defaultMessage: 'Open the documentation',
      }),
      className: 'buttonOutline',
      onClick: () => {
        const slash = docPrefixURL.startsWith('/') ? '' : '/';

        return openWithNewTab(`${slash}${docPrefixURL}/v${currentDocVersion}`);
      },
      type: 'button',
      key: 'button-open',
      Component: props => (
        <CheckPermissions permissions={pluginPermissions.open}>
          <Button {...props} />
        </CheckPermissions>
      ),
    },
    {
      label: formatMessage({
        id: getTrad('containers.HomePage.Button.update'),
        defaultMessage: 'Update',
      }),
      color: 'success',
      // onClick: () => {},
      type: 'submit',
      key: 'button-submit',
      Component: props => (
        <CheckPermissions permissions={pluginPermissions.update}>
          <Button {...props} />
        </CheckPermissions>
      ),
    },
  ];

  return (
    <Base
      actions={headerActions}
      content={formatMessage({
        id: getTrad('containers.HomePage.PluginHeader.description'),
        defaultMessage: 'Configure the documentation plugin',
      })}
      title={{
        label: formatMessage({
          id: getTrad('containers.HomePage.PluginHeader.title'),
          defaultMessage: 'Documentation - Settings',
        }),
      }}
    />
  );
};

Header.propTypes = {
  currentDocVersion: PropTypes.string.isRequired,
  docPrefixURL: PropTypes.string.isRequired,
};

export default Header;
