/**
*
* PopUpForm
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { get, map, includes, split, isEmpty, findIndex } from 'lodash';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Input from 'components/Input';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  renderInput = (item, key) => {
    // const customBootstrapClass = 'col-md-6'
    const customBootstrapClass = item.type === 'textarea' ?
      'col-md-8 offset-md-4 pull-md-4' : 'col-md-6 offset-md-6 pull-md-6';

    const shouldOverrideRendering = this.props.overrideRenderInputCondition ? this.props.overrideRenderInputCondition(item) : false;

    if (shouldOverrideRendering) {
      return this.props.overrideRenderInput(item, key);
    }

    const shouldOverrideHandleBlur = this.props.overrideHandleBlurCondition ? this.props.overrideHandleBlurCondition(item) : false;

    const value = !isEmpty(this.props.values) && includes(item.target, '.') ? get(this.props.values, [split(item.target, '.')[0], split(item.target, '.')[1]]) : this.props.values[item.target];

    const handleBlur = shouldOverrideHandleBlur ? this.props.handleBlur : false;
    const errorIndex = findIndex(this.props.formErrors, ['target', item.target]);
    const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];


    return (
      <Input
        key={key}
        type={item.type}
        handleChange={this.props.handleChange}
        handleBlur={handleBlur}
        label={item.label}
        target={item.target}
        validations={item.validations}
        inputDescription={item.inputDescription}
        value={value}
        customBootstrapClass={customBootstrapClass}
        selectOptions={this.props.selectOptions || []}
        selectOptionsFetchSucceeded={this.props.selectOptionsFetchSucceeded}
        placeholder={item.placeholder}
        title={item.title}
        errors={errors}
        didCheckErrors={this.props.didCheckErrors}
      />
    );
  }

  renderNavContainer = () => (
    <div className={styles.navContainer}>
      {map(this.props.popUpHeaderNavLinks, (link, key) => (
        <PopUpHeaderNavLink
          key={key}
          message={link.message}
          handleClick={this.changeForm}
          name={link.name}
          nameToReplace={link.nameToReplace}
          routePath={this.props.routePath}
        />
      ))}
    </div>
  )

  renderPopUpHeader = () => {
    if (this.props.renderCustomPopUpHeader) {
      return (this.props.renderCustomPopUpHeader);
    }
    return <FormattedMessage id={this.props.popUpTitle} />;
  }

  render() {
    const navContainer = this.props.noNav ? '' : this.renderNavContainer();
    const modalBody = this.props.renderModalBody ? this.props.renderModalBody()
      : map(this.props.form.items, (item, key ) => this.renderInput(item, key));

    const loader = this.props.showLoader ?
      <Button onClick={this.props.handleSubmit} type="submit" className={styles.primary} disabled={this.props.showLoader}><p className={styles.saving}><span>.</span><span>.</span><span>.</span></p></Button>
        : <Button type="submit" onClick={this.props.handleSubmit} className={styles.primary}><FormattedMessage id={this.props.buttonSubmitMessage} /></Button>;

    const modalFooter = this.props.noButtons ? <div className={styles.modalFooter} />
      : <ModalFooter className={styles.modalFooter}>
        <Button onClick={this.props.toggle} className={styles.secondary}><FormattedMessage id="form.button.cancel" /></Button>
        {loader}{' '}
      </ModalFooter>;
    return (
      <div className={styles.popUpForm}>
        <Modal isOpen={this.props.isOpen} toggle={this.props.toggle} className={`${styles.modalPosition}`}>
          <ModalHeader toggle={this.props.toggle} className={styles.popUpFormHeader} />
          <div className={styles.headerContainer}>
            <div className={styles.titleContainer}>
              {this.renderPopUpHeader()}
            </div>
            {navContainer}
          </div>
          <ModalBody className={styles.modalBody}>
            <div className="container-fluid">
              <div className="row">
                {modalBody}
              </div>
            </div>
          </ModalBody>
          {modalFooter}
        </Modal>
      </div>
    );
  }
}

PopUpForm.propTypes = {
  buttonSubmitMessage: React.PropTypes.string.isRequired,
  didCheckErrors: React.PropTypes.bool,
  form: React.PropTypes.oneOfType([
    React.PropTypes.array.isRequired,
    React.PropTypes.object.isRequired,
  ]),
  formErrors: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.object,
  ]),
  handleBlur: React.PropTypes.func,
  handleChange: React.PropTypes.func,
  handleSubmit: React.PropTypes.func,
  isOpen: React.PropTypes.bool,
  noButtons: React.PropTypes.bool,
  noNav: React.PropTypes.bool,
  overrideHandleBlurCondition: React.PropTypes.func,
  overrideRenderInput: React.PropTypes.func,
  overrideRenderInputCondition: React.PropTypes.func,
  // popUpFormType: React.PropTypes.string.isRequired,
  popUpHeaderNavLinks: React.PropTypes.array,
  popUpTitle: React.PropTypes.string,
  renderCustomPopUpHeader: React.PropTypes.oneOfType([
    React.PropTypes.func,
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  renderModalBody: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.func,
  ]),
  routePath: React.PropTypes.string,
  selectOptions: React.PropTypes.array,
  selectOptionsFetchSucceeded: React.PropTypes.bool,
  showLoader: React.PropTypes.bool,
  toggle: React.PropTypes.func,
  values: React.PropTypes.object,
};

export default PopUpForm;
