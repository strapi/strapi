import React, { useMemo } from 'react';
import { Header as PluginHeader } from '@buffetjs/custom';
import { isEqual } from 'lodash';
import { auth } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const Header = ({ initialData, isLoading, modifiedData, onCancel }) => {
  const { formatMessage } = useIntl();
  const userInfos = auth.getUserInfo();
  const areButtonsDisabled = useMemo(() => {
    return isEqual(modifiedData, initialData);
  }, [initialData, modifiedData]);

  /* eslint-disable indent */
  const headerProps = {
    actions: isLoading
      ? []
      : [
          {
            onClick: onCancel,
            disabled: areButtonsDisabled,
            color: 'cancel',
            label: formatMessage({
              id: 'app.components.Button.reset',
            }),
            type: 'button',
          },
          {
            disabled: areButtonsDisabled,
            color: 'success',
            label: formatMessage({
              id: 'app.components.Button.save',
            }),
            type: 'submit',
          },
        ],
    title: {
      label: userInfos.username || `${userInfos.firstname} ${userInfos.lastname}`,
    },
  };
  /* eslint-enable indent */

  return <PluginHeader {...headerProps} isLoading={isLoading} />;
};

Header.propTypes = {
  initialData: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default Header;
