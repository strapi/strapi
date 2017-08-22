/**
*
* PopUpForm
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      isFirstNavLinkActive: true,
      linkActive: 'base',
    };
  }

  changeForm = (linkActive) => {
    if (linkActive !== this.state.linkActive) {
      this.setState({ linkActive, isFirstNavLinkActive: !this.state.isFirstNavLinkActive });
    }
  }

  renderNavContainer = () => {
    return (
      <div className={styles.navContainer}>
        <PopUpHeaderNavLink
          message={'popUpForm.navContainer.base'}
          showActiveClass={this.state.isFirstNavLinkActive}
          handleClick={this.changeForm}
          name={'base'}
        />
        <PopUpHeaderNavLink
          message={'popUpForm.navContainer.advanced'}
          showActiveClass={!this.state.isFirstNavLinkActive}
          handleClick={this.changeForm}
          name={'advanced'}
        />
      </div>
    );
  }

  renderPopUpHeader = () => {
    const popUpTitle = `popUpForm.${this.props.popUpFormType}.header.title`;
    return <FormattedMessage id={popUpTitle} />;
  }

  render() {
    const navContainer = this.props.noNav ? '' : this.renderNavContainer();

    return (
      <div className={styles.popUpForm}>
        <Modal isOpen={this.props.isOpen} toggle={this.props.toggle} className={`${styles.modalPosition} ${styles[this.props.popUpFormType]}`}>
          <ModalHeader toggle={this.props.toggle} className={styles.popUpFormHeader} />
          <div className={styles.headerContainer}>
            <div className={styles.titleContainer}>
              {this.renderPopUpHeader()}
            </div>
            {navContainer}
          </div>
          <ModalBody>
            hello
          </ModalBody>
          <ModalFooter className={styles.modalFooter}>
            <Button type="submit" onClick={this.handleSubmit} className={styles.primary}>Save</Button>{' '}
            <Button onClick={this.toggle} className={styles.secondary}>Cancel</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

PopUpForm.propTypes = {
  isOpen: React.PropTypes.bool,
  noNav: React.PropTypes.bool,
  popUpFormType: React.PropTypes.string.isRequired,
  toggle: React.PropTypes.func,
}

export default PopUpForm;

// <div>
//   <FormattedMessage id={'popUpForm.navContainer.base'} />
// </div>
// <div>
//   <FormattedMessage id={'popUpForm.navContainer.advanced'} />
// </div>
