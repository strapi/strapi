/**
*
* PopUpRelations
*
*/

import React from 'react';
import { findIndex, get, isEmpty, map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import RelationBox from 'components/RelationBox';
import RelationNaturePicker from 'components/RelationNaturePicker';
import styles from './styles.scss';

class PopUpRelations extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.popUpHeaderNavLinks = [
      { name: 'defineRelation', message: 'popUpForm.navContainer.relation', nameToReplace: 'advancedSettings' },
      { name: 'advancedSettings', message: 'popUpForm.navContainer.advanced', nameToReplace: 'defineRelation' },
    ];
  }

  componentDidMount() {
    if (!isEmpty(this.props.dropDownItems)) {
      const target = {
        name: 'params.target',
        type: 'string',
        value: get(this.props.dropDownItems[0], 'name'),
      };

      this.props.handleChange({ target });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (isEmpty(this.props.dropDownItems) && !isEmpty(nextProps.dropDownItems)) {
      const target = {
        name: 'params.target',
        type: 'string',
        value: get(nextProps.dropDownItems[0], 'name'),
      };

      this.props.handleChange({ target });
    }
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

  renderModalBodyRelations = () => (
    <ModalBody className={`${styles.modalBody} ${styles.flex}`}>
      <RelationBox
        header={this.props.contentType}
        input={get(this.props.form, ['items', '0'])}
        value={get(this.props.values, 'name')}
        handleChange={this.props.handleChange}
        didCheckErrors={this.props.didCheckErrors}
        errors={findIndex(this.props.formErrors, ['target', get(this.props.form, ['items', '0', 'target'])]) !== -1 ? this.props.formErrors[findIndex(this.props.formErrors, ['target', get(this.props.form, ['items', '0', 'target'])])].errors : []}
      />
      <RelationNaturePicker
        selectedIco={get(this.props.values, ['params', 'nature'])}
        handleChange={this.props.handleChange}
        contentTypeName={get(this.props.contentType, 'name')}
        contentTypeTarget={get(this.props.values, ['params', 'target'])}
      />
      <RelationBox
        header={get(this.props.dropDownItems, [findIndex(this.props.dropDownItems, ['name', get(this.props.values, ['params', 'target'])])])}
        input={get(this.props.form, ['items', '1'])}
        value={get(this.props.values, ['params', 'key'])}
        handleChange={this.props.handleChange}
        didCheckErrors={this.props.didCheckErrors}
        errors={findIndex(this.props.formErrors, ['target', get(this.props.form, ['items', '1', 'target'])]) !== -1 ? this.props.formErrors[findIndex(this.props.formErrors, ['target', get(this.props.form, ['items', '1', 'target'])])].errors : []}
        dropDownItems={this.props.dropDownItems}
      />
    </ModalBody>
  )

  render() {

    const loader = this.props.showLoader ?
      <Button onClick={this.props.handleSubmit} type="submit" className={styles.primary} disabled={this.props.showLoader}><p className={styles.saving}><span>.</span><span>.</span><span>.</span></p></Button>
        : <Button type="submit" onClick={this.props.handleSubmit} className={styles.primary}><FormattedMessage id="form.button.continue" /></Button>;

    const modalBody = this.props.showRelation ? this.renderModalBodyRelations(): <div />;
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

          {modalBody}

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
  contentType: React.PropTypes.object,
  didCheckErrors: React.PropTypes.bool,
  dropDownItems: React.PropTypes.array,
  formErrors: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.object,
  ]),
  formErrors: React.PropTypes.array,
  handleChange: React.PropTypes.func,
  handleSubmit: React.PropTypes.func,
  isOpen: React.PropTypes.bool,
  popUpTitle: React.PropTypes.string.isRequired,
  routePath: React.PropTypes.string.isRequired,
  showLoader: React.PropTypes.bool,
  showRelation: React.PropTypes.bool,
  toggle: React.PropTypes.func,
  values: React.PropTypes.object,
}

export default PopUpRelations;
