/**
*
* PopUpRelations
*
*/

import React from 'react';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import styles from './styles.scss';

class PopUpRelations extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.popUpHeaderNavLinks = [
      { name: 'defineRelation', message: 'popUpForm.navContainer.relation', nameToReplace: 'advancedSettings' },
      { name: 'advancedSettings', message: 'popUpForm.navContainer.advanced', nameToReplace: 'defineRelation' },
    ];
  }

  renderNavContainer = () => (
    <div className={styles.navContainer}>
      {map(this.popUpHeaderNavLinks, (link, key) => (
        <PopUpHeaderNavLink
          key={key}
          message={link.message}
          name={link.name}
          nameToReplace={link.nameToReplace}
          routePath={this.props.routePath}
        />
      ))}
    </div>
  )

  render() {
    const loader = this.props.showLoader ?
      <Button onClick={this.props.handleSubmit} type="submit" className={styles.primary} disabled={this.props.showLoader}><p className={styles.saving}><span>.</span><span>.</span><span>.</span></p></Button>
        : <Button type="submit" onClick={this.props.handleSubmit} className={styles.primary}><FormattedMessage id="form.button.continue" /></Button>;
    return (
      <div className={styles.popUpRelations}>
        <Modal isOpen={this.props.isOpen} toggle={this.props.toggle} className={`${styles.modalPosition}`}>
          <ModalHeader toggle={this.props.toggle} className={styles.popUpFormHeader} />
          <div className={styles.headerContainer}>
            <div className={styles.titleContainer}>
              <div>
                <FormattedMessage id={this.props.popUpTitle} />
                &nbsp;
                <FormattedMessage id="popUpRelation.title" />
              </div>
            </div>

            {this.renderNavContainer()}
          </div>
          <ModalBody className={styles.modalBody}>
            <div className="container-fluid">
              <div className="row">

              </div>
            </div>
          </ModalBody>
          <ModalFooter className={styles.modalFooter}>
            <Button onClick={this.props.toggle} className={styles.secondary}><FormattedMessage id="form.button.cancel" /></Button>
            {loader}{' '}
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

PopUpRelations.propTypes = {
  handleSubmit: React.PropTypes.func,
  isOpen: React.PropTypes.bool,
  popUpTitle: React.PropTypes.string.isRequired,
  routePath: React.PropTypes.string.isRequired,
  showLoader: React.PropTypes.bool,
  toggle: React.PropTypes.func,
}

export default PopUpRelations;
