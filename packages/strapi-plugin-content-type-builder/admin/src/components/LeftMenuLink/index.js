import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';

function LeftMenuLink({ isTemporary, name, to }) {
  return (
    <NavLink to={to}>
      <p>
        {name}
        {isTemporary && (
          <FormattedMessage id={`${pluginId}.contentType.temporaryDisplay`}>
            {msg => <span>{msg}</span>}
          </FormattedMessage>
        )}
      </p>
    </NavLink>
  );
}

LeftMenuLink.defaultProps = {
  isTemporary: false,
  name: null,
};

LeftMenuLink.propTypes = {
  isTemporary: PropTypes.bool,
  name: PropTypes.string,
  to: PropTypes.string.isRequired,
};

export default memo(LeftMenuLink);
export { LeftMenuLink };
