/**
*
* RowDatabase
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
// modal
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PopUpForm from 'components/PopUpForm';
import PopUpWarning from 'components/PopUpWarning';
import styles from 'components/List/styles.scss';

class RowDatabase extends React.Component { // eslint-disable-line react/prefer-stateless-function
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      warning: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.error !== this.props.error) {
      if (isEmpty(nextProps.formErrors)) this.setState({ modal: false });
    }
  }

  showDatabaseModal = () => {
    this.setState({ modal: !this.state.modal });
    this.props.getDatabase(this.props.data.name);
  }

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  }

  toggleWarning = () => this.setState({ warning: !this.state.warning });

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.handleSubmit(this.props.data.name);
  }

  deleteDatabase = () => {
    this.setState({ warning: !this.state.warning });
    this.props.handleDatabaseDelete(this.props.data.name);
  }

  render() {
    return (
      <li className={styles.databaseFont} style={{ cursor: 'pointer'}} >
        <div style={{ position: 'absolute', width: '73rem', height: '5.2rem'}} onClick={this.showDatabaseModal}></div>
        <div className={styles.flexLi}>
          <div className={styles.flexed}>
            <div className={styles.squared} style={{ backgroundColor: this.props.data.color }}>
              {this.props.data.letter}
            </div>
            <div className={styles.label} style={{ fontWeight: '500'}}>{this.props.data.name}</div>
          </div>
          <div onClick={this.showDatabaseModal}>{this.props.data.host}</div>
          <div className={styles.centered} style={{ width: '15rem'}} onClick={this.showDatabaseModal}>{this.props.data.database}</div>
          <div className={styles.flexed} style={{ width: '4rem', justifyContent: 'space-between'}}>

            <div className={styles.ico}><i className="fa fa-pencil" onClick={this.showDatabaseModal} id={this.props.data.name} /></div>
            <div className={`${styles.leftSpaced} ${styles.ico}`}><i id={this.props.data.name} className="fa fa-trash" onClick={this.toggleWarning} /></div>
          </div>
        </div>
        <div className={styles.borderBottom} style={{ margin: `-.4rem 4.8rem 0 2.8rem`}} />
        <div>
          <Modal isOpen={this.state.modal} toggle={this.toggle} className={styles.modalPosition}>
            <ModalHeader toggle={this.toggle} className={`${styles.noBorder} ${styles.padded} ${styles.mHeader}`}>
              Databases
            </ModalHeader>
            <div className={styles.bordered} />

            <form>

              <ModalBody className={styles.modalBody}>
                <div className={styles.spacerSmall} />
                <PopUpForm {...this.props} />
              </ModalBody>
              <ModalFooter className={`${styles.noBorder} ${styles.modalFooter}`}>
                <FormattedMessage {...{id: 'form.button.cancel'}}>
                  {(message) => (
                    <Button onClick={this.toggle} className={styles.secondary}>{message}</Button>
                  )}
                </FormattedMessage>
                <FormattedMessage {...{id: 'form.button.save'}}>
                  {(message) => (
                    <Button onClick={this.handleSubmit} className={styles.primary}>{message}</Button>
                  )}
                </FormattedMessage>
              </ModalFooter>
            </form>
          </Modal>
        </div>
        <div>
          <PopUpWarning
            isOpen={this.state.warning}
            toggleModal={this.toggleWarning}
            handleConfirm={this.deleteDatabase}
            handleConfirmDanger={this.toggleWarning}
            warningMessage={'popUpWarning.databases.delete.message'}
            dangerMessage={'popUpWarning.databases.danger.message'}
            showDanger={this.props.data.isUsed}
          />
        </div>
      </li>
    );
  }
}

RowDatabase.propTypes = {
  data: React.PropTypes.object.isRequired,
  error: React.PropTypes.bool,
  getDatabase: React.PropTypes.func,
  handleDatabaseDelete: React.PropTypes.func,
  handleSubmit: React.PropTypes.func,
}

export default RowDatabase;
