/**
 *
 * RelationFormGroup
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
import FooterModal from '../../components/FooterModal';
import FormModal from '../../components/FormModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderNavLink from '../../components/HeaderNavLink';
import RelationNaturePicker from '../../components/RelationNaturePicker';
import RelationBox from '../../components/RelationBox';
import RelationsWrapper from '../../components/RelationsWrapper';
import WrapperModal from '../../components/WrapperModal';

import Icon from '../../assets/icons/icon_type_ct.png';
import IconGroup from '../../assets/icons/icon_type_groups.png';

import formAdvanced from './advanced.json';

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

  handleChangeRelationTarget = group => {
    const {
      actionType,
      featureToEditName,
      onChangeRelationTarget,
    } = this.props;

    onChangeRelationTarget(group, featureToEditName, actionType === 'edit');
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

  handleOnClosed = () => {
    const { onCancel } = this.props;

    onCancel();
    this.setState({ formErrors: {}, showForm: false }); // eslint-disable-line react/no-unused-state
  };

  handleOnOpened = () => {
    const {
      actionType,
      attributeToEditIndex,
      attributeToEditName,
      isUpdatingTemporary,
      features,
      featureToEditName,
      setTempAttribute,
    } = this.props;
    const [{ name, source }] = features;
    const target = actionType === 'edit' ? featureToEditName : name;

    setTempAttribute(
      target,
      isUpdatingTemporary,
      source,
      attributeToEditIndex,
      attributeToEditName,
      actionType === 'edit'
    );

    this.setState({ showForm: true });
  };

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
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

  renderAdvancedSettings = () => {
    const { didCheckErrors } = this.state;
    const { modifiedData, onChange } = this.props;

    return (
      <div className="relation-advanced">
        <div className="row">
          {formAdvanced.map((input, i) => {
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
                {i === 0 && <hr />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
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
      featureToEditName,
      modifiedData: { key, name, nature, plugin, target },
      features,
      onChange,
      onChangeRelationNature,
      source,
    } = this.props;
    const { formErrors, didCheckErrors } = this.state;

    return (
      <div className="relation-base">
        <RelationBox
          autoFocus
          didCheckErrors={didCheckErrors}
          errors={get(formErrors, 'name', [])}
          featureName={featureToEditName}
          isMain
          onChange={onChange}
          source={source}
          value={name}
        />
        <RelationNaturePicker
          featureName={featureToEditName}
          nature={nature}
          name={name}
          target={target}
          onClick={onChangeRelationNature}
        />
        <RelationBox
          autoFocus
          didCheckErrors={didCheckErrors}
          errors={get(formErrors, 'key', [])}
          features={features}
          nature={nature}
          onChange={onChange}
          onClick={this.handleChangeRelationTarget}
          plugin={plugin}
          selectedFeature={target}
          source={source}
          value={key}
        />
      </div>
    );
  };

  render() {
    const {
      actionType,
      activeTab,
      attributeToEditName,
      featureName,
      isOpen,
    } = this.props;
    const { showForm } = this.state;
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
              <span>{featureName}</span>
            </HeaderModalTitle>
          </section>
          <section>
            <HeaderModalTitle>
              {actionType === 'create' ? (
                <>
                  <FormattedMessage id={`${pluginId}.popUpForm.create`} />
                  &nbsp;
                  <FormattedMessage
                    id={`${pluginId}.popUpForm.attributes.relation.name`}
                  />
                </>
              ) : (
                <span>{attributeToEditName}</span>
              )}
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
              <RelationsWrapper>{showForm && content}</RelationsWrapper>
            </BodyModal>
          </FormModal>
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
  actionType: 'create',
  activeTab: 'base',
  alreadyTakenAttributes: [],
  attributeToEditIndex: null,
  attributeToEditName: '',
  featureName: null,
  featureType: 'model',
  features: [],
  featureToEditName: '',
  isOpen: false,
  isUpdatingTemporary: false,
  source: null,
};

RelationFormGroup.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  alreadyTakenAttributes: PropTypes.array,
  attributeToEditName: PropTypes.string,
  attributeToEditIndex: PropTypes.number,
  features: PropTypes.array,
  featureName: PropTypes.string,
  featureType: PropTypes.string,
  featureToEditName: PropTypes.string,
  isOpen: PropTypes.bool,
  isUpdatingTemporary: PropTypes.bool,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onChangeRelationNature: PropTypes.func.isRequired,
  onChangeRelationTarget: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSubmitEdit: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
  setTempAttribute: PropTypes.func.isRequired,
  source: PropTypes.string,
};

export default RelationFormGroup;
