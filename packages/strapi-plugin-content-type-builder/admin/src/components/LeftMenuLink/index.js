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
import pluginId from '../../pluginId';

import Span from './Span';

import styles from './styles.scss';


function LeftMenuLink({ icon, isTemporary, name, source, to }) {
  return (
    <li className={styles.leftMenuLink}>
      <NavLink className={styles.link} to={to} activeClassName={styles.linkActive}>
        <div>
          <i className={`fa ${icon}`} />
        </div>
        <div className={styles.container}>
          <span className={styles.linkSpan}>{startCase(name)}</span>
          {!!source && (
            <FormattedMessage id={`${pluginId}.from`}>
              {msg => <Span>({msg}: {source})</Span>}
            </FormattedMessage>
          )}
          {isTemporary && (
            <FormattedMessage id={`${pluginId}.contentType.temporaryDisplay`}>
              {msg => <Span>{msg}</Span>}
            </FormattedMessage>
          )}
        </div>
      </NavLink>
    </li>
  );
}

LeftMenuLink.defaultProps = {
  icon: null,
  isTemporary: false,
  name: null,
  source: null,
  to: '',
};

LeftMenuLink.propTypes = {
  icon: PropTypes.string,
  isTemporary: PropTypes.bool,
  name: PropTypes.string,
  source: PropTypes.string,
  to: PropTypes.string,
};

export default LeftMenuLink;
