/**
*
* PopUpForm
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, map, includes, split, isEmpty, findIndex } from 'lodash';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Input from 'components/Input';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import styles from './styles.scss';

/* eslint-disable react/jsx-wrap-multilines */

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  renderInput = (item, key) => {
    // const customBootstrapClass = 'col-md-6'
    let customBootstrapClass = item.type === 'textarea' ?
      'col-md-8 offset-md-4 pull-md-4' : 'col-md-6 offset-md-6 pull-md-6';

    const shouldOverrideRendering = this.props.overrideRenderInputCondition ? this.props.overrideRenderInputCondition(item) : false;

    if (shouldOverrideRendering) {
      return this.props.overrideRenderInput(item, key);
    }

    if (this.props.overrideCustomBootstrapClass) {
      customBootstrapClass = this.props.customBootstrapClass;
    }

    const shouldOverrideHandleBlur = this.props.overrideHandleBlurCondition ? this.props.overrideHandleBlurCondition(item) : false;

    const value = !isEmpty(this.props.values) && includes(item.name, '.') ? get(this.props.values, [split(item.name, '.')[0], split(item.name, '.')[1]]) : this.props.values[item.name];

    const handleBlur = shouldOverrideHandleBlur ? this.props.handleBlur : false;
    const errorIndex = findIndex(this.props.formErrors, ['name', item.name]);
    const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];


    return (
      <Input
        key={key}
        type={item.type}
        handleChange={this.props.handleChange}
        handleBlur={handleBlur}
        label={item.label}
        name={item.name}
        validations={item.validations}
        inputDescription={item.inputDescription}
        value={value}
        customBootstrapClass={customBootstrapClass}
        selectOptions={this.props.selectOptions || []}
        placeholder={item.placeholder}
        title={item.title}
        errors={errors}
        didCheckErrors={this.props.didCheckErrors}
        pluginId={this.props.pluginId}
        linkContent={item.linkContent}
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
      : <Button type="submit" onClick={this.props.handleSubmit} className={styles.primary}><FormattedMessage id={`content-type-builder.${this.props.buttonSubmitMessage}`} /></Button>;

    const modalFooter = this.props.noButtons ? <div className={styles.modalFooter} />
      : <ModalFooter className={styles.modalFooter}>
        <Button onClick={this.props.toggle} className={styles.secondary}><FormattedMessage id="content-type-builder.form.button.cancel" /></Button>
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
            <form onSubmit={this.props.handleSubmit}>
              <div className="container-fluid">
                <div className="row">
                  {modalBody}
                </div>
              </div>
            </form>
          </ModalBody>
          {modalFooter}
        </Modal>
      </div>
    );
  }
}

PopUpForm.propTypes = {
  buttonSubmitMessage: PropTypes.string.isRequired,
  customBootstrapClass: PropTypes.string,
  didCheckErrors: PropTypes.bool,
  form: PropTypes.oneOfType([
    PropTypes.array.isRequired,
    PropTypes.object.isRequired,
  ]),
  formErrors: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]),
  handleBlur: PropTypes.func,
  handleChange: PropTypes.func,
  handleSubmit: PropTypes.func,
  isOpen: PropTypes.bool,
  noButtons: PropTypes.bool,
  noNav: PropTypes.bool,
  overrideCustomBootstrapClass: PropTypes.bool,
  overrideHandleBlurCondition: PropTypes.func,
  overrideRenderInput: PropTypes.func,
  overrideRenderInputCondition: PropTypes.func,
  pluginId: PropTypes.string,
  popUpHeaderNavLinks: PropTypes.array,
  popUpTitle: PropTypes.string,
  renderCustomPopUpHeader: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.object,
    PropTypes.bool,
  ]),
  renderModalBody: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  routePath: PropTypes.string,
  selectOptions: PropTypes.array,
  showLoader: PropTypes.bool,
  toggle: PropTypes.func,
  values: PropTypes.object,
};

export default PopUpForm;
