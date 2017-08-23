/**
*
* PopUpForm
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      value: 'a',
    };
  }

  // TODO remove temp
  handleChange = ({ target }) => this.setState({ value: target.value });

  renderNavContainer = () => (
    <div className={styles.navContainer}>
      {map(this.props.popUpHeaderNavLinks, (link, key) => (
        <PopUpHeaderNavLink
          key={key}
          message={link.message}
          handleClick={this.changeForm}
          name={link.name}
          routePath={this.props.routePath}
        />
      ))}
    </div>
  )

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
            Hello
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
  popUpHeaderNavLinks: React.PropTypes.array,
  routePath: React.PropTypes.string,
  toggle: React.PropTypes.func,
};

export default PopUpForm;
