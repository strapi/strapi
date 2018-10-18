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

// Temporary picture
import Button from 'components/Button';
import InstallPluginPopup from 'components/InstallPluginPopup';
import Official from 'components/Official';
// import StarsContainer from 'components/StarsContainer';

import logoTShirt from 'assets/images/logo-t-shirt.svg';
import styles from './styles.scss';
import Screenshot from './screenshot.png';

/* eslint-disable react/no-unused-state */
class PluginCard extends React.Component {
  state = { isOpen: false, boostrapCol: 'col-lg-4' };

  componentDidMount() {
    this.shouldOpenModal(this.props);
    window.addEventListener('resize', this.setBoostrapCol);
    this.setBoostrapCol();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.history.location.hash !== this.props.history.location.hash) {
      this.shouldOpenModal(nextProps);
    }
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

  handleDownloadPlugin = (e) => {
    if (!this.props.isAlreadyInstalled && this.props.plugin.id !== 'support-us') {
      this.props.downloadPlugin(e);
    } else if (this.props.plugin.id === 'support-us') {
      this.aTag.click();
    } else {
      this.props.history.push('/list-plugins');
    }
  }

  shouldOpenModal = (props) => {
    this.setState({ isOpen: !isEmpty(props.history.location.hash) });
  }

  render() {
    const buttonClass = !this.props.isAlreadyInstalled || this.props.showSupportUsButton ? styles.primary : styles.secondary;

    let buttonLabel = this.props.isAlreadyInstalled ? 'app.components.PluginCard.Button.label.install' : 'app.components.PluginCard.Button.label.download';

    if (this.props.showSupportUsButton) {
      buttonLabel = 'app.components.PluginCard.Button.label.support';
    }

    const pluginIcon = (
      <div className={styles.frame}>
        <span className={styles.helper} />
        <img src={`${this.props.plugin.id === 'support-us' ? logoTShirt : this.props.plugin.logo}`} alt="icon" />
      </div>
    );

    const descriptions = {
      short: this.props.plugin.id === 'support-us' ? <FormattedMessage id={this.props.plugin.description.short} /> : this.props.plugin.description.short,
      long: this.props.plugin.id === 'support-us' ? <FormattedMessage id={this.props.plugin.description.long || this.props.plugin.description.short} /> : this.props.plugin.description.long || this.props.plugin.description.short,
    };

    return (
      <div className={cn(this.state.boostrapCol, styles.pluginCard)} onClick={this.handleClick}>
        <div className={styles.wrapper}>
          <div className={styles.cardTitle}>
            {pluginIcon}
            <div>{this.props.plugin.name}</div>
          </div>
          <div className={styles.cardDescription}>
            {descriptions.short}
            &nbsp;<FormattedMessage id="app.components.PluginCard.more-details" />
          </div>
          <div className={styles.cardScreenshot} style={{ backgroundImage: `url(${Screenshot})` }}>

          </div>
          <div className={styles.cardPrice}>
            <div>
              <i className={`fa fa-${this.props.plugin.isCompatible ? 'check' : 'times'}`} />
              <FormattedMessage id={`app.components.PluginCard.compatible${this.props.plugin.id === 'support-us' ? 'Community' : ''}`} />
            </div>
            <div>{this.props.plugin.price !== 0 ? `${this.props.plugin.price}€` : ''}</div>
          </div>
          <div className={styles.cardFooter} onClick={e => e.stopPropagation()}>
            <div className={styles.ratings}>
              {/*<StarsContainer ratings={this.props.plugin.ratings} />
              <div>
                <span style={{ fontWeight: '600', color: '#333740' }}>{this.props.plugin.ratings}</span>
                <span style={{ fontWeight: '500', color: '#666666' }}>/5</span>
              </div>
              */}
              <Official />
            </div>
            <div>
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
  showSupportUsButton: false,
};

PluginCard.propTypes = {
  downloadPlugin: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  isAlreadyInstalled: PropTypes.bool,
  plugin: PropTypes.object,
  showSupportUsButton: PropTypes.bool,
};

export default PluginCard;
