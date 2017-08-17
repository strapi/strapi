import React from 'react';
import { map } from 'lodash';
import { Link } from 'react-router';
import { FormattedMessage } from 'react-intl';
import PluginLeftMenuSection from 'components/PluginLeftMenuSection';
import styles from './styles.scss';

class PluginLeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginLeftMenu} col-md-3`}>
        {map(this.props.sections, (section, index) => (
          <PluginLeftMenuSection
            key={index}
            section={section}
          />
        ))}
        <div className={styles.pluginLeftMenuSection}>
          <p>
            <FormattedMessage id={'menu.section.documentation.name'} />
          </p>
          <ul>
            <li>
              <FormattedMessage id={'menu.section.documentation.guide'} />&nbsp;
              <FormattedMessage id={'menu.section.documentation.guideLink'}>
                {(message) => (
                  <Link to="#" target="_blank">{message}</Link>
                )}
              </FormattedMessage>
            </li>
            <li>
              <FormattedMessage id={'menu.section.documentation.tutorial'} />&nbsp;
              <FormattedMessage id={'menu.section.documentation.tutorialLink'}>
                {(mess) => (
                  <Link to="#" target="_blank">{mess}</Link>
                )}
              </FormattedMessage>
            </li>

          </ul>
        </div>
      </div>
    );
  }
}

PluginLeftMenu.propTypes = {
  sections: React.PropTypes.array.isRequired,
};

export default PluginLeftMenu;
