/**
*
* PluginLeftMenuSection
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import PluginLeftMenuLink from '../PluginLeftMenuLink';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class PluginLeftMenuSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const environmentsRequired = this.props.section.name === 'menu.section.environments';
    const links = map(this.props.section.items, (item, index) => (
      <PluginLeftMenuLink
        key={index}
        link={item}
        environments={this.props.environments}
        environmentsRequired={environmentsRequired}
        envParams={this.props.envParams}
      />
    ));

    return (
      <div className={styles.pluginLeftMenuSection}>
        <p>
          <FormattedMessage id={`settings-manager.${this.props.section.name}`} />
        </p>
        <ul>
          {links}
        </ul>
      </div>
    );
  }
}

PluginLeftMenuSection.propTypes = {
  environments: PropTypes.array,
  envParams: PropTypes.string,
  section: PropTypes.object,
};

export default PluginLeftMenuSection;
