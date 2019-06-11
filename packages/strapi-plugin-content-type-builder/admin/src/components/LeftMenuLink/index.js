import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';

function LeftMenuLink({ isTemporary, name, source, to }) {
  return (
    <NavLink to={to}>
      <p>
        <i className="fa fa-caret-square-o-right" />
        <span>{name}</span>
        {!!source && (
          <FormattedMessage id={`${pluginId}.from`}>
            {msg => (
              <span>
                ({msg}: {source})
              </span>
            )}
          </FormattedMessage>
        )}
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
  source: null,
};

LeftMenuLink.propTypes = {
  isTemporary: PropTypes.bool,
  name: PropTypes.string,
  source: PropTypes.string,
  to: PropTypes.string.isRequired,
};

export default LeftMenuLink;
