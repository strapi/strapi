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
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import ButtonPrimaryHotline from '../Button';
import PopUpForm from '../PopUpForm';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class List extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      // isPopUpFormValid: true,
      requiredInputs: [],
      loader: false,
    };
  }

  toggle = () => {
    if (this.props.actionBeforeOpenPopUp && !this.state.modal)
      this.props.actionBeforeOpenPopUp();
    this.setState({ modal: !this.state.modal });
  };

  handleSubmit = e => {
    e.preventDefault();
    this.setState({ modal: false });
    this.props.handleListPopUpSubmit(e);
  };

  render() {
    const handleToggle = this.toggle;
    const button = this.props.noListButtonPopUp ? (
      ''
    ) : (
      <ButtonPrimaryHotline
        buttonBackground={'secondaryAddType'}
        label={this.props.listButtonLabel}
        handlei18n={this.props.handlei18n}
        addShape
        onClick={handleToggle}
      />
    );

    const addListTitleMarginTop = this.props.addListTitleMarginTop
      ? styles.stmpaddedTopList
      : '';
    const titleSpacer = this.props.addListTitleMarginTop ? (
      <div style={{ height: '.1rem' }} />
    ) : (
      ''
    );

    const loader = this.state.loader ? (
      <Button
        onClick={this.handleSubmit}
        className={styles.stmprimary}
        disabled={this.state.loader}
      >
        <p className={styles.stmsaving}>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </p>
      </Button>
    ) : (
      <FormattedMessage id="settings-manager.form.button.save">
        {message => (
          <Button onClick={this.handleSubmit} className={styles.stmprimary}>
            {message}
          </Button>
        )}
      </FormattedMessage>
    );
    return (
      <div className={styles.stmlistContainer}>
        <div className={styles.stmlistSubContainer}>
          <div className={`${addListTitleMarginTop} ${styles.stmflex}`}>
            <div className={styles.stmtitleContainer}>
              {this.props.listTitle}
            </div>
            <div className={styles.stmbuttonContainer}>{button}</div>
          </div>
          {titleSpacer}
        </div>

        <div className={styles.stmulContainer}>
          <ul>
            {map(this.props.listItems, (listItem, key) => {
              if (this.props.renderRow) {
                return this.props.renderRow(listItem, key, styles);
              }
              return (
                <li key={key}>
                  <div className={styles.stmflexLi}>
                    {map(listItem, (item, index) => (
                      <div key={index}>{item}</div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/*  </div> */}
        <div>
          <Modal
            isOpen={this.state.modal}
            toggle={this.toggle}
            className={styles.stmmodalPosition}
          >
            <ModalHeader
              toggle={this.toggle}
              className={`${styles.stmnoBorder} ${styles.stmpadded} ${
                styles.stmmHeader
              }`}
            >
              <FormattedMessage
                id={`settings-manager.${this.props.listButtonLabel}`}
              />
            </ModalHeader>
            <div className={styles.stmbordered} />
            <form onSubmit={this.handleSubmit}>
              <ModalBody className={styles.stmmodalBody}>
                <div className={styles.stmspacerSmall} />
                <PopUpForm {...this.props} />
              </ModalBody>
              <ModalFooter
                className={`${styles.stmnoBorder} ${styles.stmmodalFooter}`}
              >
                <FormattedMessage id="settings-manager.form.button.cancel">
                  {message => (
                    <Button
                      onClick={handleToggle}
                      className={styles.stmsecondary}
                    >
                      {message}
                    </Button>
                  )}
                </FormattedMessage>
                {loader}
              </ModalFooter>
            </form>
          </Modal>
        </div>
      </div>
    );
  }
}

List.propTypes = {
  actionBeforeOpenPopUp: PropTypes.func,
  addListTitleMarginTop: PropTypes.bool,
  error: PropTypes.bool,
  formErrors: PropTypes.array,
  handlei18n: PropTypes.bool,
  handleListPopUpSubmit: PropTypes.func,
  listButtonLabel: PropTypes.string,
  listItems: PropTypes.array,
  listTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  noListButtonPopUp: PropTypes.bool,
  renderRow: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
};

export default List;
