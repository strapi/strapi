/**
*
* List
* params:
*  -handlei18n: bool
*   used for the buttonComponent to render label with FormattedMessage
*  - listButtonLabel: string
*  - listTitle: string
*  - noListButtonPopUp: bool
*     prevent from displaying the List button
*  - renderRow: function
*     overrides the default rendering of the List tr (we can pass customs components there)
*  - sections: array the elements to display
*  - handleListPopButtonSave: func
*
*/

import React from 'react';
import { map } from 'lodash';
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
    };
  }

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  }

  handleSubmit = () => {
    this.setState({ modal: !this.state.modal });
    this.props.handleListPopUpSubmit();
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

    return (
      <div className={styles.listContainer}>
        <div className={styles.listComponent}>
          <div className="container-fluid">
            <div className="row">
              <div className={styles.flex}>
                <div className={styles.titleContainer}>
                  {this.props.listTitle}
                </div>
                <div>
                  {button}
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
                <table className={` table ${styles.listNoBorder}`}>
                  <tbody>
                    {map(this.props.sections, (value, key) => {
                      // handle custom row displaying
                      if (this.props.renderRow) {
                        return this.props.renderRow(value, key, styles);
                      }
                      return (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>{value.name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Modal isOpen={this.state.modal} toggle={this.toggle}>
            <ModalHeader toggle={this.toggle} className={`${styles.noBorder}`}>
              <FormattedMessage {...{id: this.props.listButtonLabel}} />
            </ModalHeader>
            <div className={styles.bordered} />
            <ModalBody>
              <PopUpForm {...this.props} />
            </ModalBody>
            <ModalFooter className={`${styles.noBorder} ${styles.flexStart}`}>
              {/* TODO change tthis.toggle => this.props.addLanguage */}
              <Button onClick={this.handleSubmit} className={styles.primary}>Save</Button>{' '}
              <Button onClick={this.toggle} className={styles.secondary}>Cancel</Button>
            </ModalFooter>
          </Modal>
        </div>

      </div>
    );
  }
}

List.propTypes = {
  handlei18n: React.PropTypes.bool,
  handleListPopUpSubmit: React.PropTypes.func,
  listButtonLabel: React.PropTypes.string,
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
};

export default List;
