/**
 *
 * ModelForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, upperFirst } from 'lodash';

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
      cancelNewFeature,
      isUpdatingTemporaryFeature,
      featureToEditName,
      push,
      resetExistingFeatureMainInfos,
      resetNewFeatureMainInfos,
    } = this.props;

    if (actionType === 'create') {
      cancelNewFeature();
    } else if (isUpdatingTemporaryFeature) {
      resetNewFeatureMainInfos();
    } else {
      resetExistingFeatureMainInfos(featureToEditName);
    }

    push({ search: '' });
  };

  handleGoTo = to => {
    const { emitEvent } = this.context;
    const { actionType, featureType, featureToEditName, push } = this.props;
    const model =
      actionType === 'edit' ? `&modelName=${featureToEditName}` : '';

    if (to === 'advanced') {
      emitEvent('didSelectContentTypeSettings');
    }

    push({
      search: `modalType=${featureType}&settingType=${to}&actionType=${actionType}${model}`,
    });
  };

  handleOnOpened = () => this.setState({ isVisible: true });

  handleOnClosed = () => this.setState({ formErrors: {}, isVisible: false });

  handleSubmit = e => {
    e.preventDefault();

    const {
      allTakenNames,
      actionType,
      createTempFeature,
      featureType,
      isUpdatingTemporaryFeature,
      featureToEditName,
      modifiedData,
      push,
      updateTempFeature,
    } = this.props;
    const alreadyTakenContentTypeNames = allTakenNames.filter(
      name => name !== featureToEditName
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

    if (!new RegExp('^[A-Za-z][_0-9A-Za-z]*$').test(modifiedData.name)) {
      formErrors = {
        name: [{ id: `${pluginId}.error.validation.regex.name` }],
      };
    }

    this.setState(prevState => ({
      formErrors,
      didCheckErrors: !prevState.didCheckErrors,
    }));
    const pathname = `/plugins/${pluginId}/${featureType}s/${modifiedData.name}`;

    if (isEmpty(formErrors)) {
      if (actionType === 'create') {
        createTempFeature();
        push({
          pathname,
          search: 'modalType=chooseAttributes',
        });
      } else if (isUpdatingTemporaryFeature) {
        updateTempFeature();
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
      isUpdatingTemporaryFeature,
      featureToEditName,
      featureType,
      modifiedData,
      onChangeExistingFeatureMainInfos,
      onChangeNewFeatureMainInfos,
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
                <a
                  href={input.inputDescriptionParams.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
      actionType === 'create' || isUpdatingTemporaryFeature
        ? onChangeNewFeatureMainInfos
        : onChangeExistingFeatureMainInfos;
    const name =
      actionType === 'create' || isUpdatingTemporaryFeature
        ? input.name
        : `${featureToEditName}.${input.name}`;

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
      activeTab,
      featureToEditName,
      featureType,
      modifiedData,
      isOpen,
    } = this.props;
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
                values={{
                  name: upperFirst(modifiedData.name || featureToEditName),
                }}
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
  cancelNewFeature: () => {},
  connections: ['default'],
  createTempFeature: () => {},
  isOpen: false,
  isUpdatingTemporaryFeature: false,
  featureToEditName: '',
  featureType: 'model',
  modifiedData: {},
  onChangeExistingFeatureMainInfos: () => {},
  onSubmit: e => {
    e.preventDefault();
  },
  resetExistingFeatureMainInfos: () => {},
  resetNewFeatureMainInfos: () => {},
  updateTempFeature: () => {},
};

ModelForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  allTakenNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  cancelNewFeature: PropTypes.func,
  connections: PropTypes.arrayOf(PropTypes.string),
  createTempFeature: PropTypes.func,
  isOpen: PropTypes.bool,
  isUpdatingTemporaryFeature: PropTypes.bool,
  featureToEditName: PropTypes.string,
  featureType: PropTypes.string,
  modifiedData: PropTypes.object,
  onChangeExistingFeatureMainInfos: PropTypes.func,
  onChangeNewFeatureMainInfos: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  push: PropTypes.func.isRequired,
  resetExistingFeatureMainInfos: PropTypes.func,
  resetNewFeatureMainInfos: PropTypes.func,
  updateTempFeature: PropTypes.func,
};

export default ModelForm;
