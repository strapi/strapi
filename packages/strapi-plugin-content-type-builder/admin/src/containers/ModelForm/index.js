/**
 *
 * ModelForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty } from 'lodash';

import { InputsIndex as Input } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import BodyModal from '../../components/BodyModal';
import ButtonModalSecondary from '../../components/ButtonModalSecondary';
import ButtonModalSuccess from '../../components/ButtonModalSuccess';
import FooterModal from '../../components/FooterModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

import Icon from '../../assets/icons/icon_type_ct.png';
import IconGroup from '../../assets/icons/icon_type_groups.png';

import forms from './forms.json';

const NAVLINKS = [{ id: 'base' }, { id: 'advanced' }];

class ModelForm extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { didCheckErrors: false, formErrors: {}, isVisible: false };

  handleCancel = () => {
    const {
      actionType,
      cancelNewContentType,
      isUpdatingTemporaryContentType,
      modelToEditName,
      push,
      resetExistingContentTypeMainInfos,
      resetNewContentTypeMainInfos,
    } = this.props;

    if (actionType === 'create') {
      cancelNewContentType();
    } else if (isUpdatingTemporaryContentType) {
      resetNewContentTypeMainInfos();
    } else {
      resetExistingContentTypeMainInfos(modelToEditName);
    }

    push({ search: '' });
  };

  handleGoTo = to => {
    const { emitEvent } = this.context;
    const { actionType, modelToEditName, push } = this.props;
    const model = actionType === 'edit' ? `&modelName=${modelToEditName}` : '';

    if (to === 'advanced') {
      emitEvent('didSelectContentTypeSettings');
    }

    push({
      search: `modalType=model&settingType=${to}&actionType=${actionType}${model}`,
    });
  };

  handleOnOpened = () => this.setState({ isVisible: true });

  handleOnClosed = () => this.setState({ formErrors: {}, isVisible: false });

  handleSubmit = e => {
    e.preventDefault();

    const {
      allTakenNames,
      actionType,
      createTempContentType,
      featureType,
      isUpdatingTemporaryContentType,
      modelToEditName,
      modifiedData,
      push,
      updateTempContentType,
    } = this.props;
    const alreadyTakenContentTypeNames = allTakenNames.filter(
      name => name !== modelToEditName
    );
    let formErrors = {};

    if (alreadyTakenContentTypeNames.includes(modifiedData.name)) {
      formErrors = {
        name: [{ id: `${pluginId}.error.contentTypeName.taken` }],
      };
    }

    if (modifiedData.name === '') {
      formErrors = { name: [{ id: `${pluginId}.error.validation.required` }] };
    }

    this.setState(prevState => ({
      formErrors,
      didCheckErrors: !prevState.didCheckErrors,
    }));
    const pathname = `/plugins/${pluginId}/${featureType}s/${
      modifiedData.name
    }`;

    if (isEmpty(formErrors)) {
      if (actionType === 'create') {
        createTempContentType();
        push({
          pathname,
          search: 'modalType=chooseAttributes',
        });
      } else if (isUpdatingTemporaryContentType) {
        updateTempContentType();
        push({ pathname, search: '' });
      } else {
        push({ search: '' });
      }
    }
  };

  getIcon = () => {
    const { featureType } = this.props;

    return featureType === 'model' ? Icon : IconGroup;
  };

  renderInput = input => {
    const {
      actionType,
      connections,
      isUpdatingTemporaryContentType,
      featureType,
      modelToEditName,
      modifiedData,
      onChangeExistingContentTypeMainInfos,
      onChangeNewContentTypeMainInfos,
    } = this.props;
    const { didCheckErrors, formErrors, isVisible } = this.state;

    if (!isVisible) {
      return null;
    }

    /* istanbul ignore if */
    if (input.inputDescriptionParams) {
      input.inputDescription = {
        ...input.inputDescription,
        params: {
          link: (
            <FormattedMessage id={input.inputDescriptionParams.id}>
              {msg => (
                <a href={input.inputDescriptionParams.href} target="_blank">
                  {msg}
                </a>
              )}
            </FormattedMessage>
          ),
          featureType: <FormattedMessage id={`${pluginId}.${featureType}`} />,
        },
      };
    }

    const errors = get(formErrors, input.name, []);
    const onChange =
      actionType === 'create' || isUpdatingTemporaryContentType
        ? onChangeNewContentTypeMainInfos
        : onChangeExistingContentTypeMainInfos;
    const name =
      actionType === 'create' || isUpdatingTemporaryContentType
        ? input.name
        : `${modelToEditName}.${input.name}`;

    return (
      <Input
        key={input.name}
        {...input}
        didCheckErrors={didCheckErrors}
        errors={errors}
        name={name}
        onChange={onChange}
        selectOptions={connections}
        value={get(modifiedData, [input.name], '')}
      />
    );
  };

  renderNavLinks = (link, index) => {
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
    const { actionType, activeTab, featureType, isOpen } = this.props;
    const currentForm = get(forms, activeTab, forms.base);

    return (
      <WrapperModal
        isOpen={isOpen}
        onOpened={this.handleOnOpened}
        onClosed={this.handleOnClosed}
        onToggle={this.handleCancel}
      >
        <HeaderModal>
          <section>
            <HeaderModalTitle>
              <img src={this.getIcon()} alt="ct" />
              <FormattedMessage
                id={`${pluginId}.popUpForm.${actionType ||
                  'create'}.${featureType}.header.title`}
              />
            </HeaderModalTitle>
          </section>
          <section>
            <HeaderModalTitle>
              <FormattedMessage
                id={`${pluginId}.popUpForm.${actionType ||
                  'create'}.${featureType}.header.subTitle`}
              />
            </HeaderModalTitle>
            <div className="settings-tabs">
              <HeaderModalNavContainer>
                {NAVLINKS.map(this.renderNavLinks)}
              </HeaderModalNavContainer>
            </div>
            <hr />
          </section>
        </HeaderModal>
        <form onSubmit={this.handleSubmit}>
          <BodyModal>{currentForm.items.map(this.renderInput)}</BodyModal>
          <FooterModal>
            <section>
              <ButtonModalSecondary
                message={`${pluginId}.form.button.cancel`}
                onClick={this.handleCancel}
              />
              <ButtonModalSuccess
                message={`${pluginId}.form.button.done`}
                type="submit"
              />
            </section>
          </FooterModal>
        </form>
      </WrapperModal>
    );
  }
}

ModelForm.contextTypes = {
  emitEvent: PropTypes.func,
};

ModelForm.defaultProps = {
  actionType: 'create',
  activeTab: 'base',
  cancelNewContentType: () => {},
  connections: ['default'],
  createTempContentType: () => {},
  isOpen: false,
  isUpdatingTemporaryContentType: false,
  featureType: 'model',
  modelToEditName: '',
  modifiedData: {},
  onChangeExistingContentTypeMainInfos: () => {},
  onSubmit: e => {
    e.preventDefault();
  },
  resetExistingContentTypeMainInfos: () => {},
  resetNewContentTypeMainInfos: () => {},
  updateTempContentType: () => {},
};

ModelForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  allTakenNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  cancelNewContentType: PropTypes.func,
  connections: PropTypes.arrayOf(PropTypes.string),
  createTempContentType: PropTypes.func,
  isOpen: PropTypes.bool,
  isUpdatingTemporaryContentType: PropTypes.bool,
  featureType: PropTypes.string,
  modelToEditName: PropTypes.string,
  modifiedData: PropTypes.object,
  onChangeExistingContentTypeMainInfos: PropTypes.func,
  onChangeNewContentTypeMainInfos: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  push: PropTypes.func.isRequired,
  resetExistingContentTypeMainInfos: PropTypes.func,
  resetNewContentTypeMainInfos: PropTypes.func,
  updateTempContentType: PropTypes.func,
};

export default ModelForm;
