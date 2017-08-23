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
import { Link } from 'react-router';
import styles from './styles.scss';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    if (this.props.renderCustomLink) return this.props.renderCustomLink(this.props, styles);

    return (
      <li className={styles.pluginLeftMenuLink}>
        <Link className={styles.link} to={`/plugins/${this.props.basePath}/${this.props.link.name}`} activeClassName={styles.linkActive}>
          <div>
            <i className={`fa ${this.props.link.icon}`} />
          </div>
          <span>{this.props.link.name}</span>
        </Link>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  basePath: React.PropTypes.string,
  link: React.PropTypes.object.isRequired,
  renderCustomLink: React.PropTypes.func,
};

export default PluginLeftMenuLink;
