/**
 *
 * PluginLeftMenu
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import PluginLeftMenuSection from '../PluginLeftMenuSection';
import styles from './styles.scss';

class PluginLeftMenu extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.stmpluginLeftMenu} col-md-3`}>
        {map(this.props.sections, (section, index) => (
          <PluginLeftMenuSection
            key={index}
            section={section}
            environments={this.props.environments}
            envParams={this.props.envParams}
          />
        ))}
      </div>
    );
  }
}

PluginLeftMenu.propTypes = {
  environments: PropTypes.array.isRequired,
  envParams: PropTypes.string,
  sections: PropTypes.array.isRequired,
};

PluginLeftMenu.defaultProps = {
  envParams: '',
};

export default PluginLeftMenu;
