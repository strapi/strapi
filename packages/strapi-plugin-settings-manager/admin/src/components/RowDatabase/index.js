/**
*
* RowDatabase
*
*/

import React from 'react';
import PropTypes from 'prop-types';
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
      loader: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.error !== this.props.error) {
      if (isEmpty(nextProps.formErrors)) this.setState({ modal: false, loader: false });
    }

    // if (nextProps.formErrors !== this.props.formErrors && nextProps.formErrors) this.setState({ loader: false });
    if (!isEmpty(nextProps.formErrors)) this.setState({ loader: false });
  }

  componentWillUnmount() {
    // this.setState({})
  }

  showDatabaseModal = (e) => {
    if (e.target.id !== 'trash') {
      this.setState({ modal: !this.state.modal });
      this.props.getDatabase(this.props.data.name);
    }
  }

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  }

  toggleWarning = () => this.setState({ warning: !this.state.warning });

  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({ loader: true });
    this.props.handleSubmit(this.props.data.name);
  }

  deleteDatabase = () => {
    this.setState({ warning: !this.state.warning });
    this.props.handleDatabaseDelete(this.props.data.name);
  }

  render() {
    const loader = this.state.loader
      ? <Button onClick={this.handleSubmit} className={styles.primary} disabled={this.state.loader}><p className={styles.saving}><span>.</span><span>.</span><span>.</span></p></Button>
      : (
        <FormattedMessage id="settings-manager.form.button.save">
          {(message) => (
            <Button onClick={this.handleSubmit} className={styles.primary}>{message}</Button>
          )}
        </FormattedMessage>
      );
    return (
      <li className={`${styles.databaseFont}`} style={{ cursor: 'pointer'}} onClick={this.showDatabaseModal}>
        <div className={styles.flexLi}>
          <div className={styles.flexed}>
            <div className={styles.squared} style={{ backgroundColor: this.props.data.color }}>
              {this.props.data.letter}
            </div>
            <div className={styles.label} style={{ fontWeight: '500'}}>{this.props.data.name}</div>
          </div>
          <div className={styles.dbHost}>
            {this.props.data.host}
          </div>
          <div className={styles.centered} style={{ width: '15rem'}}>{this.props.data.database}</div>
          <div className={styles.flexed} style={{ minWidth: '3rem', justifyContent: 'space-between'}}>

            <div className={styles.ico}><i className="fa fa-pencil" id={this.props.data.name} /></div>
            <div className={`${styles.leftSpaced} ${styles.ico}`}><i id="trash" className="fa fa-trash" onClick={this.toggleWarning} /></div>
          </div>
        </div>
        <div>
          <Modal isOpen={this.state.modal} toggle={this.toggle} className={styles.modalPosition}>
            <ModalHeader toggle={this.toggle} className={`${styles.noBorder} ${styles.padded} ${styles.mHeader}`}>
              Databases
            </ModalHeader>
            <div className={styles.bordered} />

            <form autoComplete="off">

              <ModalBody className={styles.modalBody}>
                <div className={styles.spacerSmall} />
                <PopUpForm {...this.props} />
              </ModalBody>
              <ModalFooter className={`${styles.noBorder} ${styles.modalFooter}`}>
                <FormattedMessage id="settings-manager.form.button.cancel">
                  {(message) => (
                    <Button onClick={this.toggle} className={styles.secondary}>{message}</Button>
                  )}
                </FormattedMessage>
                {loader}
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
  data: PropTypes.object,
  error: PropTypes.bool,
  formErrors: PropTypes.array,
  getDatabase: PropTypes.func,
  handleDatabaseDelete: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default RowDatabase;
