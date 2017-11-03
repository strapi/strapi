/**
*
* PluginLeftMenuLink
*   - Required props:
*     - {object} Link
*
*   - Optionnal props:
*     - {function} renderCustomLink : overrides the behavior of the link
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import styles from './styles.scss';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    if (this.props.renderCustomLink) return this.props.renderCustomLink(this.props, styles);

    const icon = this.props.customIcon || this.props.link.icon;
    return (
      <li className={styles.pluginLeftMenuLink}>
        <NavLink className={styles.link} to={`/plugins/${this.props.basePath}/${this.props.link.name}`} activeClassName={styles.linkActive}>
          <div>
            <i className={`fa ${icon}`} />
          </div>
          <span>{this.props.link.name}</span>
        </NavLink>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  basePath: PropTypes.string,
  customIcon: PropTypes.string,
  link: PropTypes.object.isRequired,
  renderCustomLink: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
};

PluginLeftMenuLink.defaultProps = {
  basePath: '',
  customIcon: '',
  renderCustomLink: false,
};

export default PluginLeftMenuLink;
