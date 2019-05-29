/**
 *
 * ModelForm
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
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

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
      currentData,
      isUpdatingTemporaryContentType,
      modifiedData,
      actionType,
      createTempContentType,
      modelToEditName,
      push,
      updateTempContentType,
    } = this.props;
    const alreadyTakenContentTypeNames = Object.keys(currentData).filter(
      name => name !== modelToEditName,
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
    const pathname = `/plugins/${pluginId}/models/${modifiedData.name}`;

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

  renderInput = input => {
    const {
      actionType,
      connections,
      isUpdatingTemporaryContentType,
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
    const { actionType, activeTab, isOpen } = this.props;
    const currentForm = get(forms, activeTab, forms.base);

    return (
      <WrapperModal
        isOpen={isOpen}
        onOpened={this.handleOnOpened}
        onClosed={this.handleOnClosed}
        onToggle={this.handleCancel}
      >
        <HeaderModal>
          <HeaderModalTitle
            title={`${pluginId}.popUpForm.${actionType ||
              'create'}.contentType.header.title`}
          />
          <HeaderModalNavContainer>
            {NAVLINKS.map(this.renderNavLinks)}
          </HeaderModalNavContainer>
        </HeaderModal>
        <form onSubmit={this.handleSubmit}>
          <BodyModal>{currentForm.items.map(this.renderInput)}</BodyModal>
          <FooterModal>
            <ButtonModalSecondary
              message={`${pluginId}.form.button.cancel`}
              onClick={this.handleCancel}
            />
            <ButtonModalPrimary
              message={`${pluginId}.form.button.save`}
              type="submit"
            />
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
  currentData: {},
  isOpen: false,
  isUpdatingTemporaryContentType: false,
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
  cancelNewContentType: PropTypes.func,
  connections: PropTypes.arrayOf(PropTypes.string),
  createTempContentType: PropTypes.func,
  currentData: PropTypes.object,
  isOpen: PropTypes.bool,
  isUpdatingTemporaryContentType: PropTypes.bool,
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
