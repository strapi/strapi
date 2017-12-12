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

import styles from './styles.scss';

class InstallPluginPopup extends React.Component {
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
    // {
    //   content: 'app.components.InstallPluginPopup.navLink.screenshots',
    //   name: 'screenshots',
    // },
    // {
    //   content: 'app.components.InstallPluginPopup.navLink.avis',
    //   name: 'avis',
    // },
  ];

  render() {
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle} className={styles.modalPosition}>
        <ModalHeader toggle={this.toggle} className={styles.modalHeader} />
        <ModalBody className={styles.modalBody}>
          <div className={styles.wrapper}>

            <div className={styles.headerWrapper}>
              <div className={styles.logo} style={{ backgroundImage: `url(${this.props.plugin.logo})`}} />
              <div className={styles.headerInfo}>
                <div className={styles.name}>{this.props.plugin.name}</div>
                <div className={styles.ratings}>
                  <div className={styles.starsContainer}>
                    <div>
                      {map(this.props.coloredStars, star => <i key={star} className="fa fa-star" />)}
                    </div>
                    <div>
                      {map(this.props.emptyStars, star => <i key={star} className="fa fa-star" />)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontWeight: '600', color: '#333740', fontSize: '12px'}}>{this.props.plugin.ratings}</span>
                    <span style={{ fontWeight: '500', color: '#666666', fontSize: '11px' }}>/5</span>
                  </div>
                </div>
                <div className={styles.headerDescription}>
                  <FormattedMessage id={this.props.plugin.description} />
                </div>
                <div className={styles.headerButtonContainer}>
                  <div>
                    <i className={`fa fa-${this.props.plugin.isCompatible ? 'check' : 'times'}`} />
                    <FormattedMessage id={`app.components.PluginCard.compatible${this.props.plugin.id === 'support-us' ? 'Community' : ''}`} />
                  </div>
                  <div>
                    <span style={{ fontWeight: '600' }}>+{this.props.plugin.downloads_nb}k&nbsp;</span><FormattedMessage id="app.components.InstallPluginPopup.downloads" />
                  </div>
                  <div>
                    <div className={styles.buttonWrapper}>
                      <div>
                        <FormattedMessage id="app.components.InstallPluginPopup.downloads" />
                      </div>
                      <div>{this.props.plugin.price}&nbsp;€</div>
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
                <div key={link.name} className={isActive ? styles.navLink : ''} onClick={() => this.props.history.push({ pathname: this.props.history.location.pathname, hash: `${this.props.plugin.id}::${link.name}` })} style={isActive ? { paddingTop: '5px'} : { paddingTop: '7px' }}>
                  <FormattedMessage id={link.content} />
                </div>
              );
            })}
          </div>
          <div className={styles.pluginDescription}>
            {this.props.plugin.longDescription}
          </div>
        </ModalBody>
      </Modal>
    );
  }
}


InstallPluginPopup.propTypes = {
  coloredStars: PropTypes.array.isRequired,
  emptyStars: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  plugin: PropTypes.object.isRequired,
};

export default InstallPluginPopup;
