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
import Input from 'components/InputsIndex';
import PopUpHeaderNavLink from 'components/PopUpHeaderNavLink';
import styles from './styles.scss';

/* eslint-disable react/jsx-wrap-multilines */

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  createComponent = (el) => {
    if (get(el, ['inputDescription', 'params', 'link', 'children', 'type'], '') === 'FormattedMessage') {
      return (
        <FormattedMessage id={get(el, ['inputDescription', 'params', 'link', 'children', 'attr', 'id'], 'default')} defaultMessage=" ">
          {(message) => (
            React.createElement(
              // Create the wrapper component
              // This line will create the link
              get(el, ['inputDescription', 'params', 'link', 'parent', 'type'], 'span'),
              // Set the attributes
              get(el, ['inputDescription', 'params', 'link', 'parent', 'attr'], ''),
              message,
            )
          )}
        </FormattedMessage>
      );
    }

    return (
      React.createElement(
        get(el, ['inputDescription', 'params', 'link', 'parent', 'type'], 'span'),
        // Set the attributes
        get(el, ['inputDescription', 'params', 'link', 'parent', 'attr'], ''),
        React.createElement(
          get(el, ['inputDescription', 'params', 'link', 'children', 'type'], 'span'),
          get(el, ['inputDescription', 'params', 'link', 'children', 'attr'], ''),
          get(el, ['inputDescription', 'params', 'link', 'children', 'innerHTML'], ''),
        )
      )
    );
  }

  handleSubmit = (e) => {
    this.props.onSubmit(e, true);
  }

  renderInput = (item, key) => {
    // const customBootstrapClass = 'col-md-6'
    let customBootstrapClass = item.type === 'textarea' ?
      'col-md-8 offset-md-4 mr-md-5' : 'col-md-6 offset-md-6 mr-md-5';

    const shouldOverrideRendering = this.props.overrideRenderInputCondition ? this.props.overrideRenderInputCondition(item) : false;

    if (shouldOverrideRendering) {
      return this.props.overrideRenderInput(item, key);
    }

    if (this.props.overrideCustomBootstrapClass) {
      customBootstrapClass = this.props.customBootstrapClass;
    }

    const shouldOverrideHandleBlur = this.props.overrideHandleBlurCondition ? this.props.overrideHandleBlurCondition(item) : false;
    // TODO: refacto this line..
    let value = !isEmpty(this.props.values) && includes(item.name, '.') ? get(this.props.values, [split(item.name, '.')[0], split(item.name, '.')[1]]) : this.props.values[item.name];
    const handleBlur = shouldOverrideHandleBlur ? this.props.onBlur : false;
    const errorIndex = findIndex(this.props.formErrors, ['name', item.name]);
    const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];
    const inputDescription = {
      id: get(item, ['inputDescription', 'id'], ''),
      params: {
        link: this.createComponent(item),
      },
    };

    if (item.name === 'params.appearance.WYSIWYG') {
      value = get(this.props.values, item.name, false);
    }

    return (
      <Input
        key={key}
        type={item.type}
        onChange={this.props.onChange}
        onBlur={handleBlur}
        label={item.label}
        name={item.name}
        validations={item.validations}
        inputDescription={inputDescription}
        value={value}
        customBootstrapClass={customBootstrapClass}
        selectOptions={this.props.selectOptions || []}
        placeholder={item.placeholder}
        title={item.title}
        errors={errors}
        didCheckErrors={this.props.didCheckErrors}
        autoFocus={key === 0 && item.type !== 'date'}
      />
    );
  }

  renderNavContainer = () => (
    <div className={styles.navContainer}>
      {map(this.props.popUpHeaderNavLinks, (link, key) => (
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

  renderPopUpHeader = () => {
    if (this.props.renderCustomPopUpHeader) {
      return (this.props.renderCustomPopUpHeader);
    }
    return <FormattedMessage id={this.props.popUpTitle} />;
  }

  renderFooter = () => {
    const { popUpFormType, buttonSubmitMessage, toggle, noButtons, onSubmit } = this.props;
    const handleToggle = toggle;

    if (noButtons) {
      return <div className={styles.modalFooter} />;
    }

    return (
      <ModalFooter className={styles.modalFooter}>
        <Button onClick={handleToggle} className={styles.secondary}><FormattedMessage id="content-type-builder.form.button.cancel" /></Button>
        {popUpFormType !== 'contentType' && <Button type="submit" onClick={this.handleSubmit} className={styles.primaryAddShape}><FormattedMessage id="content-type-builder.button.attributes.add" /></Button>}
        <Button type="submit" onClick={onSubmit} className={styles.primary}><FormattedMessage id={`content-type-builder.${buttonSubmitMessage}`} /></Button>{' '}
      </ModalFooter>
    );
  }

  render() {
    const navContainer = this.props.noNav ? '' : this.renderNavContainer();
    const modalBodyStyle = this.props.renderModalBody ? { paddingTop: '2.3rem' } : {};
    const modalBody = this.props.renderModalBody ? this.props.renderModalBody()
      : map(this.props.form.items, (item, key ) => this.renderInput(item, key));
    
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
          <ModalBody className={styles.modalBody} style={modalBodyStyle}>
            <form onSubmit={this.props.onSubmit}>
              <div className="container-fluid">
                <div className="row">
                  {modalBody}
                </div>
              </div>
            </form>
          </ModalBody>
          {this.renderFooter()}
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
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  formErrors: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]),
  isOpen: PropTypes.bool.isRequired,
  noButtons: PropTypes.bool,
  noNav: PropTypes.bool,
  onBlur: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  overrideCustomBootstrapClass: PropTypes.bool,
  overrideHandleBlurCondition: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  overrideRenderInput: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  overrideRenderInputCondition: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  popUpFormType: PropTypes.string,
  popUpHeaderNavLinks: PropTypes.array,
  popUpTitle: PropTypes.string.isRequired,
  renderCustomPopUpHeader: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.object,
    PropTypes.bool,
  ]),
  renderModalBody: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]).isRequired,
  routePath: PropTypes.string,
  selectOptions: PropTypes.array,
  toggle: PropTypes.func.isRequired,
  values: PropTypes.object,
};

PopUpForm.defaultProps = {
  customBootstrapClass: 'col-md-6',
  didCheckErrors: false,
  formErrors: [],
  noButtons: false,
  noNav: false,
  onBlur: false,
  overrideCustomBootstrapClass: false,
  overrideHandleBlurCondition: false,
  overrideRenderInput: false,
  overrideRenderInputCondition: false,
  popUpFormType: '',
  popUpHeaderNavLinks: [],
  renderCustomPopUpHeader: false,
  routePath: '',
  selectOptions: [],
  values: {},
};

export default PopUpForm;
