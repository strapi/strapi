/**
 *
 * AttributeForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty } from 'lodash';

import { InputsIndex as Input } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import BodyModal from '../../components/BodyModal';
import ButtonModalPrimary from '../../components/ButtonModalPrimary';
import ButtonModalSecondary from '../../components/ButtonModalSecondary';
import ButtonModalSuccess from '../../components/ButtonModalSuccess';
import CustomCheckbox from '../../components/CustomCheckbox';
import FooterModal from '../../components/FooterModal';
import FormModal from '../../components/FormModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

import Icon from '../../assets/icons/icon_type_ct.png';
import IconGroup from '../../assets/icons/icon_type_groups.png';

import supportedAttributes from './supportedAttributes.json';

const NAVLINKS = [{ id: 'base' }, { id: 'advanced' }];

class AttributeForm extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { didCheckErrors: false, formErrors: {}, showForm: false };

  getCurrentForm = () => {
    const { activeTab, attributeType } = this.props;

    return get(supportedAttributes, [attributeType, activeTab, 'items'], []);
  };

  getIcon = () => {
    const { featureType } = this.props;

    return featureType === 'model' ? Icon : IconGroup;
  };

  getFormErrors = () => {
    const {
      alreadyTakenAttributes,
      attributeToEditName,
      modifiedData,
    } = this.props;

    let formErrors = {};
    const formValidations = this.getFormValidations();
    const alreadyTakenAttributesUpdated = alreadyTakenAttributes.filter(
      attribute => attribute !== attributeToEditName
    );

    if (isEmpty(modifiedData.name)) {
      formErrors = { name: [{ id: `${pluginId}.error.validation.required` }] };
    }

    if (alreadyTakenAttributesUpdated.includes(get(modifiedData, 'name', ''))) {
      formErrors = { name: [{ id: `${pluginId}.error.attribute.taken` }] };
    }

    formErrors = Object.keys(formValidations).reduce((acc, current) => {
      const { custom, validations } = formValidations[current];
      const value = modifiedData[current];

      if (
        current === 'name' &&
        !new RegExp('^[A-Za-z][_0-9A-Za-z]*$').test(value)
      ) {
        acc[current] = [{ id: `${pluginId}.error.validation.regex.name` }];
      }

      if (!value && validations.required === true && custom !== true) {
        acc[current] = [{ id: `${pluginId}.error.validation.required` }];
      }

      if (custom === true && validations.required === true && value === '') {
        acc[current] = [{ id: `${pluginId}.error.validation.required` }];
      }

      if (current === 'enum' && !!value) {
        const split = value.split('\n');

        const hasEnumFormatError = split.filter(
          v => !new RegExp('^[_A-Za-z][_0-9A-Za-z]*$').test(v)
        );

        if (hasEnumFormatError.length > 0) {
          acc[current] = [{ id: `${pluginId}.error.validation.regex.values` }];
        }
      }

      return acc;
    }, formErrors);

    this.setState(prevState => ({
      didCheckErrors: !prevState.didCheckErrors,
      formErrors,
    }));

    return formErrors;
  };

  getFormValidations = () => {
    const { attributeType } = this.props;
    const form = supportedAttributes[attributeType];

    return Object.keys(form).reduce((acc, current) => {
      return {
        ...acc,
        ...form[current].items.reduce((acc2, curr) => {
          acc2[curr.name] = {
            validations: curr.validations,
            custom: curr.custom,
          };

          return acc2;
        }, {}),
      };
    }, {});
  };

  handleCancel = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  handleGoTo = to => {
    const { emitEvent } = this.context;
    const { actionType, attributeToEditName, attributeType, push } = this.props;
    const attributeName =
      actionType === 'edit' ? `&attributeName=${attributeToEditName}` : '';

    if (to === 'advanced') {
      emitEvent('didSelectContentTypeFieldSettings');
    }

    push({
      search: `modalType=attributeForm&attributeType=${attributeType}&settingType=${to}&actionType=${actionType}${attributeName}`,
    });
  };

  handleOnClosed = () => {
    const { onCancel } = this.props;

    onCancel();
    this.setState({ formErrors: {}, showForm: false });
  };

  handleOnOpened = () => this.setState({ showForm: true });

  handleSubmit = () => {
    if (isEmpty(this.getFormErrors())) {
      if (this.props.actionType === 'create') {
        this.props.onSubmit();
      } else {
        this.props.onSubmitEdit();
      }
    }
  };

  handleSubmitAndContinue = e => {
    e.preventDefault();
    const { emitEvent } = this.context;

    if (isEmpty(this.getFormErrors())) {
      if (this.props.actionType === 'create') {
        this.props.onSubmit(true);
      } else {
        this.props.onSubmitEdit(true);
      }

      emitEvent('willAddMoreFieldToContentType');
    }
  };

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  renderInput = (input, index) => {
    const { modifiedData, onChange } = this.props;
    const { didCheckErrors, formErrors } = this.state;
    const { custom, defaultValue, name, type } = input;

    const value = get(modifiedData, name, defaultValue);

    const errors = get(formErrors, name, []);

    if (custom) {
      if (type === 'select') {
        const { attributeOptions } = this.props;

        const options = attributeOptions.map(option => {
          return {
            name: option.name,
            value: option.uid,
          };
        });

        return (
          <Input
            autoFocus={index === 0}
            didCheckErrors={didCheckErrors}
            errors={errors}
            key={name}
            {...input}
            onChange={onChange}
            selectOptions={options}
            value={value}
          />
        );
      }
      return (
        <CustomCheckbox
          didCheckErrors={didCheckErrors}
          errors={errors}
          key={name}
          {...input}
          onChange={onChange}
          value={value}
        />
      );
    }

    return (
      <Input
        autoFocus={index === 0}
        didCheckErrors={didCheckErrors}
        errors={errors}
        key={name}
        {...input}
        onChange={onChange}
        value={value}
      />
    );
  };

  renderNavLink = (link, index) => {
    const { activeTab } = this.props;

    return (
      <HeaderNavLink
        isActive={activeTab === link.id}
        key={link.id}
        {...link}
        onClick={this.handleGoTo}
        nextTab={index === NAVLINKS.length - 1 ? 0 : index + 1}
      />
    );
  };

  render() {
    const {
      actionType,
      attributeToEditName,
      attributeType,
      featureType,
      isOpen,
    } = this.props;
    const { showForm } = this.state;
    const currentForm = this.getCurrentForm();
    const titleContent =
      actionType === 'create' ? attributeType : attributeToEditName;

    return (
      <WrapperModal
        isOpen={isOpen}
        onClosed={this.handleOnClosed}
        onOpened={this.handleOnOpened}
        onToggle={this.handleToggle}
      >
        <HeaderModal>
          <section>
            <HeaderModalTitle>
              <img src={this.getIcon()} alt="feature" />
              <span>{titleContent}</span>
            </HeaderModalTitle>
          </section>
          <section>
            <HeaderModalTitle>
              <FormattedMessage
                id={`${pluginId}.popUpForm.${actionType || 'create'}`}
              />
            </HeaderModalTitle>
            <div className="settings-tabs">
              <HeaderModalNavContainer>
                {NAVLINKS.map(this.renderNavLink)}
              </HeaderModalNavContainer>
            </div>
            <hr />
          </section>
        </HeaderModal>
        <form onSubmit={this.handleSubmitAndContinue}>
          <FormModal>
            <BodyModal>
              {showForm && currentForm.map(this.renderInput)}
            </BodyModal>
          </FormModal>
          <FooterModal>
            <section>
              <ButtonModalPrimary
                message={`${pluginId}.form.button.add.${featureType}`}
                type="submit"
                add
              />
            </section>
            <section>
              <ButtonModalSecondary
                message={`${pluginId}.form.button.cancel`}
                onClick={this.handleCancel}
              />
              <ButtonModalSuccess
                message={`${pluginId}.form.button.done`}
                type="button"
                onClick={this.handleSubmit}
              />
            </section>
          </FooterModal>
        </form>
      </WrapperModal>
    );
  }
}

AttributeForm.contextTypes = {
  emitEvent: PropTypes.func,
};

AttributeForm.defaultProps = {
  actionType: 'create',
  activeTab: 'base',
  attributeToEditName: '',
  alreadyTakenAttributes: [],
  attributeType: 'string',
  attributeOptions: [],
  featureType: 'model',
  isOpen: false,
  modifiedData: {},
  onCancel: () => {},
  onChange: () => {},
  onSubmit: () => {},
  push: () => {},
};

AttributeForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  alreadyTakenAttributes: PropTypes.array,
  attributeToEditName: PropTypes.string,
  attributeType: PropTypes.string,
  attributeOptions: PropTypes.array,
  featureType: PropTypes.string,
  isOpen: PropTypes.bool,
  modifiedData: PropTypes.object, // TODO: Clearly define this object (It's working without it though)
  onCancel: PropTypes.func,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onSubmitEdit: PropTypes.func.isRequired,
  push: PropTypes.func,
};

export default AttributeForm;
