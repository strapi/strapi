/*
*
* PluginLeftMenu
*
*   - Required props :
*     - {array} sections : Menu section
*
*   - Optionnal props :
*     - {function} addCustomSection : Allows to add the menu a custom section
*     - {function} renderCustomLink : Overrides the link behavior
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import PluginLeftMenuSection from '../PluginLeftMenuSection';
import styles from './styles.scss';

class PluginLeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const customSection = this.props.addCustomSection ? this.props.addCustomSection(styles) : '';
    return (
      <div className={`${styles.pluginLeftMenu} col-md-3`}>
        {map(this.props.sections, (section, index) => (
          <PluginLeftMenuSection
            key={index}
            section={section}
            renderCustomLink={this.props.renderCustomLink}
            basePath={this.props.basePath}
            customIcon={this.props.customIcon}
          />
        ))}
        {customSection}
      </div>
    );
  }
}

PluginLeftMenu.propTypes = {
  addCustomSection: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  basePath: PropTypes.string,
  customIcon: PropTypes.string,
  renderCustomLink: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  sections: PropTypes.array.isRequired,
};

PluginLeftMenu.defaultProps = {
  addCustomSection: false,
  basePath: '',
  customIcon: '',
  renderCustomLink: false,
};

export default PluginLeftMenu;
