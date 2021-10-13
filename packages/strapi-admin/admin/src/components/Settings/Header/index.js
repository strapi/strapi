import React, { useMemo } from 'react';
import { Header as PluginHeader } from '@buffetjs/custom';
import { isEqual } from 'lodash';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const Header = ({
  content,
  initialData,
  isLoading,
  label,
  modifiedData,
  onCancel,
  showHeaderButtonLoader,
}) => {
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
            isLoading: showHeaderButtonLoader,
          },
        ],
    title: {
      label,
    },
    content,
  };
  /* eslint-enable indent */

  return <PluginHeader {...headerProps} isLoading={isLoading} />;
};

Header.defaultProps = {
  content: null,
  label: '',
  showHeaderButtonLoader: false,
};

Header.propTypes = {
  content: PropTypes.string,
  initialData: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  label: PropTypes.string,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  showHeaderButtonLoader: PropTypes.bool,
};

export default Header;
