/**
*
* List
* params:
*  -handlei18n: bool
*   used for the buttonComponent to render label with FormattedMessage
*  - listButtonLabel: string
*  - listTitle: string
*  - noListButtonPopUp: bool
*     prevent from displaying the OldList button
*  - renderRow: function
*     overrides the default rendering of the OldList tr (we can pass customs components there)
*  - listItems: array the elements to display
*  - handleListPopButtonSave: func
*
*/

import React from 'react';
import { forEach, has, map} from 'lodash';
import { FormattedMessage } from 'react-intl';

import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import ButtonPrimaryHotline from 'components/Button';
import PopUpForm from 'components/PopUpForm';
import styles from './styles.scss';

class List extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      isPopUpFormValid: true,
      requiredInputs: [],
    };
  }

  componentDidMount() {
    const requiredInputs = [];
    forEach(this.props.sections, (section) => {
      forEach(section.items, (item) => {
        if (has(item.validations, 'required')) {
          requiredInputs.push( item.target );
        }
      });
    });

    this.setState({ requiredInputs });

    forEach(requiredInputs, (inputTarget) => {
      if (!has(this.props.values, inputTarget)) {
        this.setState({ isPopUpFormValid: false });
      }
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.values !== this.props.values) {
      forEach(this.state.requiredInputs, (inputTarget) => { // eslint-disable-line consistent-return
        if (has(nextProps.values, inputTarget) && nextProps.values[inputTarget] !== "") {
          this.setState({ isPopUpFormValid: true });
        } else {
          this.setState({ isPopUpFormValid: false });
          return false;
        }
      });
    }
  }

  toggle = () => {
    if (this.props.actionBeforeOpenPopUp && !this.state.modal) this.props.actionBeforeOpenPopUp();
    this.setState({ modal: !this.state.modal });
  }

  handleSubmit = (e) => {
    e.preventDefault();

    if (this.state.isPopUpFormValid) {
      this.setState({ modal: !this.state.modal });
      this.props.handleListPopUpSubmit(e);
    }
  }

  render() {
    const button = this.props.noListButtonPopUp ? '' :
      <ButtonPrimaryHotline
        buttonBackground={'secondaryAddType'}
        label={this.props.listButtonLabel}
        handlei18n={this.props.handlei18n}
        addShape
        onClick={this.toggle}
      />;

    const addListTitleMarginTop = this.props.addListTitleMarginTop ? styles.paddedTopList : '';

    return (
      <div className={styles.listContainer}>
        <div className={styles.listSubContainer}>
          <div className={`${addListTitleMarginTop} ${styles.flex}`}>
            <div className={styles.titleContainer}>
              {this.props.listTitle}
            </div>
            <div className={styles.buttonContainer}>
              {button}
            </div>
          </div>
          <div className={styles.ulContainer}>
            <ul>
              {map(this.props.listItems, (listItem, key) => {
                if (this.props.renderRow) {
                  return this.props.renderRow(listItem, key, styles);
                }
                return (
                  <li key={key}>
                    <div className={styles.flexLi}>
                      {map(listItem, (item, index) => (
                        <div key={index}>{item}</div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div>
          <Modal isOpen={this.state.modal} toggle={this.toggle} className={styles.modalPosition}>
            <ModalHeader toggle={this.toggle} className={`${styles.noBorder} ${styles.padded} ${styles.mHeader}`}>
              <FormattedMessage {...{id: this.props.listButtonLabel}} />
            </ModalHeader>
            <div className={styles.bordered} />
            <form onSubmit={this.handleSubmit}>

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
                    <Button type="submit" onClick={this.handleSubmit} className={styles.primary} disabled={!this.state.isPopUpFormValid}>{message}</Button>
                  )}
                </FormattedMessage>
              </ModalFooter>
            </form>
          </Modal>
        </div>
      </div>
    );
  }
}

List.propTypes = {
  actionBeforeOpenPopUp: React.PropTypes.func,
  addListTitleMarginTop: React.PropTypes.bool,
  handlei18n: React.PropTypes.bool,
  handleListPopUpSubmit: React.PropTypes.func,
  listButtonLabel: React.PropTypes.string,
  listItems: React.PropTypes.array,
  listTitle: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.object,
  ]),
  noListButtonPopUp: React.PropTypes.bool,
  renderRow: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.func,
  ]),
  sections: React.PropTypes.array,
  values: React.PropTypes.object,
}

export default List;
