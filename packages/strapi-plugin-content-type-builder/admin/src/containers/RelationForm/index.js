/**
 *
 * RelationForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty } from 'lodash';

import Input from 'components/InputsIndex';

import pluginId from '../../pluginId';

import BodyModal from '../../components/BodyModal';
import ButtonModalPrimary from '../../components/ButtonModalPrimary';
import ButtonModalSecondary from '../../components/ButtonModalSecondary';
import FooterModal from '../../components/FooterModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

import NaturePicker from './NaturePicker';
import RelationWrapper from './RelationWrapper';
import RelationBox from './RelationBox';

import formAdvanced from './advanced.json';

import styles from './styles.scss';

const NAVLINKS = [{ id: 'base', custom: 'relation' }, { id: 'advanced' }];

class RelationForm extends React.Component {
  // eslint-disable-line react/prefer-stateless-function

  state = { didCheckErrors: false, formErrors: {}, showForm: false };

  getFormErrors = () => {
    const { actionType, alreadyTakenAttributes, attributeToEditName, modifiedData } = this.props;
    const formValidations = {
      name: { required: true, unique: true },
      key: { required: true, unique: true },
    };

    const alreadyTakenAttributesUpdated = alreadyTakenAttributes.filter(attribute => {
      if (actionType === 'edit') {
        return attribute !== attributeToEditName && attribute !== modifiedData.key;
      }

      return attribute !== attributeToEditName;
    });

    let formErrors = {};

    if (modifiedData.name === modifiedData.key) {
      formErrors = { key: [{ id: `${pluginId}.error.attribute.key.taken` }] };
    }

    formErrors = Object.keys(formValidations).reduce((acc, current) => {
      const { required, unique } = formValidations[current];
      const value = modifiedData[current];

      if (required === true && !value) {
        acc[current] = [{ id: `${pluginId}.error.validation.required` }];
      }

      if (unique === true && alreadyTakenAttributesUpdated.includes(value)) {
        acc[current] = [{ id: `${pluginId}.error.attribute.key.taken` }];
      }

      return acc;
    }, formErrors);

    this.setState(prevState => ({
      didCheckErrors: !prevState.didCheckErrors,
      formErrors,
    }));

    return formErrors;
  };

  handleClick = model => {
    const { actionType, modelToEditName, onChangeRelationTarget } = this.props;

    onChangeRelationTarget(model, modelToEditName, actionType === 'edit');
  };

  handleCancel = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  handleGoTo = to => {
    const { emitEvent } = this.context;
    const { actionType, attributeToEditName, push } = this.props;
    const attributeName = actionType === 'edit' ? `&attributeName=${attributeToEditName}` : '';

    if (to === 'advanced') {
      emitEvent('didSelectContentTypeFieldSettings');
    }

    push({
      search: `modalType=attributeForm&attributeType=relation&settingType=${to}&actionType=${actionType}${attributeName}`,
    });
  };

  handleOnClosed = () => {
    const { onCancel } = this.props;

    onCancel();
    this.setState({ formErrors: {}, showForm: false }); // eslint-disable-line react/no-unused-state
  };

  handleOnOpened = () => {
    const {
      actionType,
      attributeToEditName,
      initData,
      isUpdatingTemporaryContentType,
      models,
      modelToEditName,
    } = this.props;
    const [{ name, source }] = models;
    const target = actionType === 'edit' ? modelToEditName : name;

    initData(target, isUpdatingTemporaryContentType, source, attributeToEditName, actionType === 'edit');
    this.setState({ showForm: true });
  };

  handleSubmit = e => {
    e.preventDefault();

    if (isEmpty(this.getFormErrors())) {
      this.submit();
    }
  };

  handleSubmitAndContinue = e => {
    e.preventDefault();

    if (isEmpty(this.getFormErrors())) {
      this.submit(true);
    }
  };

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  submit = (shouldContinue = false) => {
    const { actionType, onSubmit, onSubmitEdit } = this.props;

    if (actionType === 'edit') {
      onSubmitEdit(shouldContinue);
    } else {
      onSubmit(shouldContinue);
    }
  };

  renderAdvancedSettings = () => {
    const { didCheckErrors } = this.state;
    const { modifiedData, onChange } = this.props;

    return formAdvanced.map((input, i) => {
      const divider = i === 0 ? <div className={styles.divider} /> : null;

      return (
        <React.Fragment key={input.name}>
          <Input
            {...input}
            addon={modifiedData[input.addon]}
            didCheckErrors={didCheckErrors}
            key={input.name}
            onChange={onChange}
            value={modifiedData[input.name]}
          />
          {divider}
        </React.Fragment>
      );
    });
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

  renderRelationForm = () => {
    const {
      modifiedData: { key, name, nature, plugin, target },
      models,
      modelToEditName,
      onChange,
      onChangeRelationNature,
      source,
    } = this.props;
    const { formErrors, didCheckErrors } = this.state;

    return (
      <RelationWrapper>
        <RelationBox
          autoFocus
          errors={get(formErrors, 'name', [])}
          didCheckErrors={didCheckErrors}
          main
          modelName={modelToEditName}
          onChange={onChange}
          source={source}
          value={name}
        />
        <NaturePicker
          modelName={modelToEditName}
          nature={nature}
          name={name}
          target={target}
          onClick={onChangeRelationNature}
        />
        <RelationBox
          errors={get(formErrors, 'key', [])}
          didCheckErrors={didCheckErrors}
          models={models}
          nature={nature}
          onChange={onChange}
          onClick={this.handleClick}
          selectedModel={target}
          plugin={plugin}
          value={key}
        />
      </RelationWrapper>
    );
  };

  render() {
    const { actionType, activeTab, attributeToEditName, isOpen } = this.props;
    const { showForm } = this.state;
    const titleContent = actionType === 'create' ? 'relation' : attributeToEditName;
    const content =
      activeTab === 'base' || !activeTab ? this.renderRelationForm() : this.renderAdvancedSettings();

    return (
      <WrapperModal
        isOpen={isOpen}
        onClosed={this.handleOnClosed}
        onOpened={this.handleOnOpened}
        onToggle={this.handleToggle}
      >
        <HeaderModal>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
            <FormattedMessage id={`${pluginId}.popUpForm.${actionType || 'create'}`} />
            &nbsp;
            <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>{titleContent}</span>
            &nbsp;
            <FormattedMessage id={`${pluginId}.popUpForm.field`} />
          </div>
          <HeaderModalNavContainer>{NAVLINKS.map(this.renderNavLink)}</HeaderModalNavContainer>
        </HeaderModal>
        <form onSubmit={this.handleSubmitAndContinue}>
          <BodyModal>{showForm && content}</BodyModal>
          <FooterModal>
            <ButtonModalSecondary message={`${pluginId}.form.button.cancel`} onClick={this.handleCancel} />
            <ButtonModalPrimary message={`${pluginId}.form.button.continue`} type="submit" add />
            <ButtonModalPrimary
              message={`${pluginId}.form.button.save`}
              type="button"
              onClick={this.handleSubmit}
            />
          </FooterModal>
        </form>
      </WrapperModal>
    );
  }
}

RelationForm.contextTypes = {
  emitEvent: PropTypes.func,
};

RelationForm.defaultProps = {
  actionType: 'create',
  activeTab: 'base',
  alreadyTakenAttributes: [],
  attributeToEditName: '',
  isOpen: false,
  isUpdatingTemporaryContentType: false,
  models: [],
  modelToEditName: '',
  source: null,
};

RelationForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  alreadyTakenAttributes: PropTypes.array,
  attributeToEditName: PropTypes.string,
  initData: PropTypes.func.isRequired,
  isOpen: PropTypes.bool,
  isUpdatingTemporaryContentType: PropTypes.bool,
  models: PropTypes.array,
  modelToEditName: PropTypes.string,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onChangeRelationNature: PropTypes.func.isRequired,
  onChangeRelationTarget: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSubmitEdit: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
  source: PropTypes.string,
};

export default RelationForm;
