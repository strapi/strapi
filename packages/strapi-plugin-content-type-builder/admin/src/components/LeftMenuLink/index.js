import React from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';

import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';

function Link({ isTemporary, name, source, to }) {
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

Link.defaultProps = {
  isTemporary: false,
  name: null,
  source: null,
};

Link.propTypes = {
  isTemporary: PropTypes.bool,
  name: PropTypes.string,
  source: PropTypes.string,
  to: PropTypes.string.isRequired,
};

export default Link;
