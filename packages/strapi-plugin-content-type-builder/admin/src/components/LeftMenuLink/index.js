/**
*
* LeftMenuLink
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

function LeftMenuLink({ icon, name, source, to }) {
  return (
    <li className={styles.leftMenuLink}>
      <NavLink className={styles.link} to={to} activeClassName={styles.linkActive}>
        <div>
          <i className={`fa ${icon}`} />
        </div>
        <div className={styles.container}>
          <span className={styles.linkSpan}>{startCase(name)}</span>
          {!!source && (
            <FormattedMessage id="content-type-builder.from">
              {msg => <span id="from-wrapper" style={{ marginLeft: '1rem', fontStyle: 'italic', marginRight: '10px' }}>({msg}: {source})</span>}
            </FormattedMessage>
          )}
        </div>
      </NavLink>
    </li>
  );
}

LeftMenuLink.defaultProps = {
  icon: null,
  name: null,
  source: null,
  to: '',
};

LeftMenuLink.propTypes = {
  icon: PropTypes.string,
  name: PropTypes.string,
  source: PropTypes.string,
  to: PropTypes.string,
};

export default LeftMenuLink;
