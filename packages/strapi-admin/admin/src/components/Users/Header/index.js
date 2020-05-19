import React, { useMemo } from 'react';
import { Header as PluginHeader } from '@buffetjs/custom';
import { isEqual } from 'lodash';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const Header = ({ initialData, isLoading, label, modifiedData, onCancel }) => {
  const { formatMessage } = useIntl();
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
      label,
    },
  };
  /* eslint-enable indent */

  return <PluginHeader {...headerProps} isLoading={isLoading} />;
};

Header.defaultProps = {
  label: '',
};

Header.propTypes = {
  initialData: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  label: PropTypes.string,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default Header;
