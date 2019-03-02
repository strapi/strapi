/**
*
* PluginCard
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isEmpty, replace } from 'lodash';
import { FormattedMessage } from 'react-intl';

import Button from 'components/Button';
import InstallPluginPopup from '../InstallPluginPopup';

import styles from './styles.scss';

const PLUGINS_WITH_CONFIG = ['content-manager', 'email', 'upload'];

/* eslint-disable react/no-unused-state */
class PluginCard extends React.Component {
  state = { 
    boostrapCol: 'col-lg-4',
  };

  componentDidMount() {
    // Listen window resize.
    window.addEventListener('resize', this.setBoostrapCol);
    this.setBoostrapCol();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.setBoostrapCol);
  }

  setBoostrapCol = () => {
    let boostrapCol = 'col-lg-4';

    if (window.innerWidth > 1680) {
      boostrapCol = 'col-lg-3';
    }

    if (window.innerWidth > 2300) {
      boostrapCol = 'col-lg-2';
    }

    this.setState({ boostrapCol });
  }

  handleClick = () => {
    if (this.props.plugin.id !== 'support-us') {
      this.props.history.push({
        pathname: this.props.history.location.pathname,
        hash: `${this.props.plugin.id}::description`,
      });
    } else {
      this.aTag.click();
    }
  }

  handleClickSettings = (e) => {
    const settingsPath = this.props.plugin.id === 'content-manager' ? '/plugins/content-manager/ctm-configurations' : `/plugins/${this.props.plugin.id}/configurations/${this.props.currentEnvironment}`; 

    e.preventDefault();
    e.stopPropagation();

    this.props.history.push(settingsPath);
  }

  handleDownloadPlugin = (e) => {
    if (!this.props.isAlreadyInstalled && this.props.plugin.id !== 'support-us') {
      this.props.downloadPlugin(e);
    } else if (this.props.plugin.id === 'support-us') {
      this.aTag.click();
    } else {
      this.props.history.push('/list-plugins');
    }
  }

  render() {
    const buttonClass = !this.props.isAlreadyInstalled ? styles.primary : styles.secondary;
    const buttonLabel = this.props.isAlreadyInstalled ? 'app.components.PluginCard.Button.label.install' : 'app.components.PluginCard.Button.label.download';

    // Display settings link for a selection of plugins.
    const settingsComponent = (PLUGINS_WITH_CONFIG.includes(this.props.plugin.id) && 
      <div className={styles.settings} onClick={this.handleClickSettings}>
        <i className='fa fa-cog' />
        <FormattedMessage id='app.components.PluginCard.settings' />
      </div>
    );

    const descriptions = {
      short: this.props.plugin.id === 'support-us' ? <FormattedMessage id={this.props.plugin.description.short} /> : this.props.plugin.description.short,
      long: this.props.plugin.id === 'support-us' ? <FormattedMessage id={this.props.plugin.description.long || this.props.plugin.description.short} /> : this.props.plugin.description.long || this.props.plugin.description.short,
    };

    return (
      <div className={cn(this.state.boostrapCol, styles.pluginCard)}>
        <div className={styles.wrapper}>
          <div className={styles.cardTitle}>
            <div className={styles.frame}>
              <span className={styles.helper} />
              <img src={this.props.plugin.logo} alt="icon" />
            </div>
            <div>{this.props.plugin.name} <i className='fa fa-external-link' onClick={() => window.open(`https://github.com/strapi/strapi/tree/master/packages/strapi-plugin-${this.props.plugin.id}`, '_blank')} /></div>
          </div>
          <div className={styles.cardDescription}>
            {descriptions.long}
            {/* &nbsp;<FormattedMessage id="app.components.PluginCard.more-details" /> */}
          </div>
          <div className={styles.cardFooter} onClick={e => e.stopPropagation()}>
            <div className={styles.cardFooterButton}>
              <Button
                className={cn(buttonClass, styles.button)}
                label={buttonLabel}
                onClick={this.handleDownloadPlugin}
              />
              <a
                href="https://strapi.io/shop"
                style={{ display: 'none' }}
                ref={(a) => { this.aTag = a; }}
                target="_blank"
              >
                &nbsp;
              </a>
            </div>
            {this.props.isAlreadyInstalled ? 
              (
                settingsComponent
              )
              :
              (
                <div className={styles.compatible}>
                  <i className={`fa fa-${this.props.plugin.isCompatible ? 'check' : 'times'}`} />
                  <FormattedMessage id={`app.components.PluginCard.compatible${this.props.plugin.id === 'support-us' ? 'Community' : ''}`} />
                </div>
              )
            }
          </div>
        </div>
        <InstallPluginPopup
          history={this.props.history}
          isAlreadyInstalled={this.props.isAlreadyInstalled}
          isOpen={!isEmpty(this.props.history.location.hash) && replace(this.props.history.location.hash.split('::')[0], '#', '') === this.props.plugin.id}
          plugin={this.props.plugin}
        />
      </div>
    );
  }
}

PluginCard.defaultProps = {
  isAlreadyInstalled: false,
  plugin: {
    description: '',
    id: '',
    name: '',
    price: 0,
    ratings: 5,
  },
};

PluginCard.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  isAlreadyInstalled: PropTypes.bool,
  plugin: PropTypes.object,
};

export default PluginCard;
