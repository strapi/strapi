/**
 *
 * RelationForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

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

const NAVLINKS = [{ id: 'base', custom: 'relation' }, { id: 'advanced' }];

class RelationForm extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { didCheckErrors: false, formErrors: {}, showForm: false };

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
    this.setState({ formErrors: {}, showForm: false });
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
  };

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  renderAdvancedSettings = () => {
    return null;
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
      source,
    } = this.props;

    return (
      <RelationWrapper>
        <RelationBox modelName={modelToEditName} source={source} main value={name} />
        <NaturePicker nature={nature} modelName={modelToEditName} name={name} keyTarget={key} />
        <RelationBox
          models={models}
          nature={nature}
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
        <form onSubmit={this.handleSubmit}>
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
  attributeToEditName: '',
  isOpen: false,
  isUpdatingTemporaryContentType: false,
  models: [],
  modelToEditName: '',
  push: () => {},
  source: null,
};

RelationForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  attributeToEditName: PropTypes.string,
  initData: PropTypes.func.isRequired,
  isOpen: PropTypes.bool,
  isUpdatingTemporaryContentType: PropTypes.bool,
  models: PropTypes.array,
  modelToEditName: PropTypes.string,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  push: PropTypes.func,
  source: PropTypes.string,
};

export default RelationForm;
