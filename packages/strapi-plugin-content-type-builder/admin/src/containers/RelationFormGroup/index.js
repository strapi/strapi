/**
 *
 * RelationFormGroup
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, upperFirst } from 'lodash';

import pluginId from '../../pluginId';

import BodyModal from '../../components/BodyModal';
import ButtonModalPrimary from '../../components/ButtonModalPrimary';
import ButtonModalSecondary from '../../components/ButtonModalSecondary';
import ButtonModalSuccess from '../../components/ButtonModalSuccess';
import FooterModal from '../../components/FooterModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderNavLink from '../../components/HeaderNavLink';
import RelationBox from '../../components/RelationBox';
import RelationsWrapper from '../../components/RelationsWrapper';
import WrapperModal from '../../components/WrapperModal';

// import NaturePicker from './NaturePicker';
// import RelationBox from './RelationBox';

import Icon from '../../assets/icons/icon_type_ct.png';
import IconGroup from '../../assets/icons/icon_type_groups.png';

const NAVLINKS = [{ id: 'base', custom: 'relation' }, { id: 'advanced' }];

class RelationFormGroup extends React.Component {
  // eslint-disable-line react/prefer-stateless-function

  state = { didCheckErrors: false, formErrors: {}, showForm: false };

  getFormErrors = () => {
    const {
      actionType,
      alreadyTakenAttributes,
      attributeToEditName,
      modifiedData,
    } = this.props;
    const formValidations = {
      name: { required: true, unique: true },
      key: { required: true, unique: true },
    };

    const alreadyTakenAttributesUpdated = alreadyTakenAttributes.filter(
      attribute => {
        if (actionType === 'edit') {
          return (
            attribute !== attributeToEditName && attribute !== modifiedData.key
          );
        }

        return attribute !== attributeToEditName;
      }
    );

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

  getIcon = () => {
    const { featureType } = this.props;

    return featureType === 'model' ? Icon : IconGroup;
  };

  handleCancel = () => {
    const { push } = this.props;

    push({ search: '' });
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
      isUpdatingTemporary,
      features,
      featureToEditName,
      setTempAttribute,
    } = this.props;
    const [{ name, source }] = features;
    const target = actionType === 'edit' ? featureToEditName : name;
    console.log(target);

    setTempAttribute(
      target,
      isUpdatingTemporary,
      source,
      attributeToEditName,
      actionType === 'edit'
    );

    this.setState({ showForm: true });
  };

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  handleGoTo = to => {
    const { emitEvent } = this.context;
    const { actionType, attributeToEditName, push } = this.props;
    const attributeName =
      actionType === 'edit' ? `&attributeName=${attributeToEditName}` : '';

    if (to === 'advanced') {
      emitEvent('didSelectContentTypeFieldSettings');
    }

    push({
      search: `modalType=attributeForm&attributeType=relation&settingType=${to}&actionType=${actionType}${attributeName}`,
    });
  };

  handleSubmitAndContinue = e => {
    e.preventDefault();

    if (isEmpty(this.getFormErrors())) {
      this.submit(true);
    }
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

  submit = (shouldContinue = false) => {
    const { actionType, onSubmit, onSubmitEdit } = this.props;

    if (actionType === 'edit') {
      onSubmitEdit(shouldContinue);
    } else {
      onSubmit(shouldContinue);
    }
  };

  renderRelationForm = () => {
    const {
      featureName,
      modifiedData: { key, name, nature, plugin, target },
      features,
      onChange,
      onChangeRelationNature,
      source,
    } = this.props;
    const { formErrors, didCheckErrors } = this.state;

    return (
      <RelationsWrapper>
        <RelationBox
          autoFocus
          didCheckErrors={didCheckErrors}
          errors={get(formErrors, 'name', [])}
          featureName={featureName}
          main
          onChange={onChange}
          source={source}
          value={name}
        />
        <RelationBox
          autoFocus
          didCheckErrors={didCheckErrors}
          errors={get(formErrors, 'key', [])}
          features={features}
          nature={nature}
          onChange={onChange}
          plugin={plugin}
          selectedFeature={target}
          source={source}
          value={key}
        />
        {/* <RelationBox
          autoFocus
          errors={get(formErrors, 'name', [])}
          didCheckErrors={didCheckErrors}
          main
          modelName={groupToEditName}
          onChange={onChange}
          source={source}
          value={name}
        />
        <NaturePicker
          modelName={groupToEditName}
          nature={nature}
          name={name}
          target={target}
          onClick={onChangeRelationNature}
        />
        <RelationBox
          errors={get(formErrors, 'key', [])}
          didCheckErrors={didCheckErrors}
          groups={groups}
          nature={nature}
          onChange={onChange}
          onClick={this.handleClick}
          selectedModel={target}
          plugin={plugin}
          value={key}
        /> */}
      </RelationsWrapper>
    );
  };

  render() {
    const { actionType, activeTab, attributeToEditName, isOpen } = this.props;
    const { showForm } = this.state;
    const titleContent =
      actionType === 'create' ? 'relation' : attributeToEditName;
    const content =
      activeTab === 'base' || !activeTab
        ? this.renderRelationForm()
        : this.renderAdvancedSettings();

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
              <img src={this.getIcon()} alt="ct" />
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
          <BodyModal>{showForm && content}</BodyModal>
          <FooterModal>
            <section>
              <ButtonModalPrimary
                message={`${pluginId}.form.button.add`}
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

RelationFormGroup.contextTypes = {
  emitEvent: PropTypes.func,
};

RelationFormGroup.defaultProps = {
  featureType: 'model',
};

RelationFormGroup.propTypes = {
  featureType: PropTypes.string,
};

export default RelationFormGroup;
