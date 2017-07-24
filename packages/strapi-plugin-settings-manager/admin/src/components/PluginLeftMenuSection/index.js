/**
*
* PluginLeftMenuSection
*
*/

import React from 'react';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import PluginLeftMenuLink from 'components/PluginLeftMenuLink';
import styles from './styles.scss';


class PluginLeftMenuSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const links = map(this.props.section.items, (item, index) => (
      <PluginLeftMenuLink
        key={index}
        link={item}
        environments={this.props.environments}
      />
    ));
    return (
      <div className={styles.pluginLeftMenuSection}>
        <p>
          <FormattedMessage {...{id: this.props.section.name}} />
        </p>
        <ul>
          {links}
        </ul>
      </div>
    );
  }
}

PluginLeftMenuSection.propTypes = {
  environments: React.PropTypes.array,
  section: React.PropTypes.object.isRequired,
};

export default PluginLeftMenuSection;
