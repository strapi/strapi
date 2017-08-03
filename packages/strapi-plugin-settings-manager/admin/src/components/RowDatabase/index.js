/**
*
* RowDatabase
*
*/

import React from 'react';
// modal
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PopUpForm from 'components/PopUpForm';
import styles from 'components/List/styles.scss';

class RowDatabase extends React.Component { // eslint-disable-line react/prefer-stateless-function
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      databaseName: '',
    };
  }

  showDatabaseModal = ({ target }) => {
    this.setState({ modal: !this.state.modal, databaseName: target.id });
    this.props.getDatabase(target.id);
  }

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.handleSubmit(this.state.databaseName);
  }
  render() {
    return (
      <li>
        <div className={styles.flexLi}>
          <div className={styles.flexed}>
            <div className={styles.squared} style={{ backgroundColor: this.props.data.color }}>
              {this.props.data.letter}
            </div>
            <div className={styles.label}>{this.props.data.name}</div>
          </div>
          <div>{this.props.data.database}</div>
          <div className={styles.centered}>{this.props.data.host}</div>
          <div className={styles.flexed}>

            <div><i className="fa fa-pencil" onClick={this.showDatabaseModal} id={this.props.data.name} /></div>
            <div className={styles.leftSpaced}><i id={this.props.data.name} className="fa fa-trash" onClick={this.props.handleDatabaseDelete} /></div>
          </div>
        </div>
        <div>
          <Modal isOpen={this.state.modal} toggle={this.toggle} className={styles.modalPosition}>
            <ModalHeader toggle={this.toggle} className={`${styles.noBorder} ${styles.padded} ${styles.mHeader}`}>
              Databases
            </ModalHeader>
            <div className={styles.bordered} />
            <form>

              <ModalBody className={styles.modalBody}>
                <PopUpForm {...this.props} />
              </ModalBody>
              <ModalFooter className={`${styles.noBorder} ${styles.modalFooter}`}>
                <Button onClick={this.handleSubmit} className={styles.primary}>Save</Button>{' '}
                <Button onClick={this.toggle} className={styles.secondary}>Cancel</Button>
              </ModalFooter>
            </form>
          </Modal>
        </div>
      </li>
    );
  }
}

RowDatabase.propTypes = {
  data: React.PropTypes.object.isRequired,
  getDatabase: React.PropTypes.func,
  handleDatabaseDelete: React.PropTypes.func,
  handleSubmit: React.PropTypes.func,
}

export default RowDatabase;
