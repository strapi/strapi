/**
*
* PluginLeftMenuLink
*
*/

import React from 'react';
import { Link } from 'react-router';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  onClick =  () => {
    console.log('click');
  }

  renderAddLink = () => (
    <li className={styles.pluginLeftMenuLink}>
      <div className={styles.liInnerContainer} onClick={this.onClick}>
        <div>
          <i className={`fa ${this.props.link.icon}`} />
        </div>
        <span><FormattedMessage id={this.props.link.name} /></span>
      </div>
    </li>
  )

  render() {
    if (this.props.link.name === 'button.contentType.add') return this.renderAddLink();

    return (
      <li className={styles.pluginLeftMenuLink}>
        <Link className={styles.link} to={`/plugins/content-type-builder/${this.props.link.name}`} activeClassName={styles.linkActive}>
          <div>
            <i className={`fa ${this.props.link.icon}`} />
          </div>
          <span><FormattedMessage id={this.props.link.name} /></span>
        </Link>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  link: React.PropTypes.object.isRequired,
};

export default PluginLeftMenuLink;
