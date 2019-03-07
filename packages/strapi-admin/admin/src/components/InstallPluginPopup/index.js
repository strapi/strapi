/*
*
* InstallPluginPopup
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { map } from 'lodash';
import cn from 'classnames';

import Official from '../Official';
// import StarsContainer from 'components/StarsContainer';

import styles from './styles.scss';

class InstallPluginPopup extends React.Component {
  handleClick = () => {
    this.props.history.push({ pathname: this.props.history.location.pathname });

    if (!this.props.isAlreadyInstalled) {
      this.context.downloadPlugin(this.props.plugin.id);
    }
  }

  toggle = () => {
    this.props.history.push({
      pathname: this.props.history.location.pathname,
    });
  }

  navLinks = [
    {
      content: 'app.components.InstallPluginPopup.navLink.description',
      name: 'description',
    },
    {
      content: 'app.components.InstallPluginPopup.navLink.screenshots',
      name: 'screenshots',
    },
    {
      content: 'app.components.InstallPluginPopup.navLink.avis',
      name: 'avis',
    },
    {
      content: 'app.components.InstallPluginPopup.navLink.faq',
      name: 'faq',
    },
    {
      content: 'app.components.InstallPluginPopup.navLink.changelog',
      name: 'changelog',
    },
  ];

  render() {
    const descriptions = {
      short: this.props.plugin.id === 'support-us' ? <FormattedMessage id={this.props.plugin.description.short} /> : this.props.plugin.description.short,
      long: this.props.plugin.id === 'support-us' ? <FormattedMessage id={this.props.plugin.description.long || this.props.plugin.description.short} /> : this.props.plugin.description.long || this.props.plugin.description.short,
    };
    const buttonName = this.props.isAlreadyInstalled ? 'app.components.PluginCard.Button.label.install' : 'app.components.InstallPluginPopup.downloads';

    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle} className={styles.modalPosition}>
        <ModalHeader toggle={this.toggle} className={styles.modalHeader} />
        <ModalBody className={styles.modalBody}>
          <div className={styles.wrapper}>

            <div className={styles.headerWrapper}>
              <div className={styles.logo}><img src={`${this.props.plugin.logo}`} alt="icon" /></div>
              <div className={styles.headerInfo}>
                <div className={styles.name}>{this.props.plugin.name}</div>
                <div className={styles.ratings}>
                  {/*}
                  <StarsContainer ratings={this.props.plugin.ratings} />
                  <div>
                    <span style={{ fontWeight: '600', color: '#333740', fontSize: '12px'}}>{this.props.plugin.ratings}</span>
                    <span style={{ fontWeight: '500', color: '#666666', fontSize: '11px' }}>/5</span>
                  </div>
                  */}
                  <Official style={{ marginTop: '0' }} />
                </div>
                <div className={styles.headerDescription}>
                  {descriptions.short}
                </div>
                <div className={styles.headerButtonContainer}>
                  <div>
                    <i className={`fa fa-${this.props.plugin.isCompatible ? 'check' : 'times'}`} />
                    <FormattedMessage id={`app.components.PluginCard.compatible${this.props.plugin.id === 'support-us' ? 'Community' : ''}`} />
                  </div>
                  <div>
                    <div>
                      {/*}
                      <span style={{ fontWeight: '600' }}>+{this.props.plugin.downloads_nb}k&nbsp;</span><FormattedMessage id="app.components.InstallPluginPopup.downloads" />
                      */}
                    </div>
                    <div className={styles.buttonWrapper} onClick={this.handleClick}>
                      <div>
                        <FormattedMessage id={buttonName} />
                      </div>
                      {/* Uncomment whebn prices are running}
                      <div>{this.props.plugin.price}&nbsp;€</div>
                    */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.navContainer}>
            {map(this.navLinks, link => {
              const isActive = this.props.history.location.hash.split('::')[1] === link.name;

              return (
                <div
                  key={link.name}
                  className={cn(isActive ? styles.navLink : '', link.name !== 'description' ? styles.notAllowed : '')}
                  onClick={() => {
                    if (link.name === 'description') {
                      this.props.history.push({ pathname: this.props.history.location.pathname, hash: `${this.props.plugin.id}::${link.name}` });
                    }
                  }}
                  style={isActive ? { paddingTop: '4px'} : { paddingTop: '6px' }}
                >
                  <FormattedMessage id={link.content} />
                </div>
              );
            })}
          </div>
          <div className={styles.pluginDescription}>
            {descriptions.long}
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

InstallPluginPopup.contextTypes = {
  downloadPlugin: PropTypes.func.isRequired,
};

InstallPluginPopup.defaultProps = {
  description: {
    short: 'app.Components.InstallPluginPopup.noDescription',
  },
};

InstallPluginPopup.propTypes = {
  description: PropTypes.shape({
    long: PropTypes.string,
    short: PropTypes.string,
  }),
  history: PropTypes.object.isRequired,
  isAlreadyInstalled: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  plugin: PropTypes.object.isRequired,
};

export default InstallPluginPopup;
