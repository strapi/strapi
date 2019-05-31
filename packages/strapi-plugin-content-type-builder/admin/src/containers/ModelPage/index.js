/**
 *
 * ModelPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { FormattedMessage } from 'react-intl';
import { Redirect } from 'react-router-dom';
import { get, isEqual, pickBy } from 'lodash';
import { Prompt } from 'react-router';

import {
  Button,
  EmptyAttributesBlock,
  PluginHeader,
  PopUpWarning,
  routerPropTypes,
  getQueryParameters,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import AttributeLi from '../../components/AttributeLi';
import Block from '../../components/Block';
import Flex from '../../components/Flex';
import LeftMenu from '../../components/LeftMenu';
import LeftMenuSection from '../../components/LeftMenuSection';
import LeftMenuSectionTitle from '../../components/LeftMenuSectionTitle';
import LeftMenuLink from '../../components/LeftMenuLink';
import ListTitle from '../../components/ListTitle';
import Ul from '../../components/Ul';

import AttributeForm from '../AttributeForm';
import AttributesModalPicker from '../AttributesPickerModal';
import ModelForm from '../ModelForm';
import RelationForm from '../RelationForm';

import {
  addAttributeToExistingContentType,
  addAttributeToTempContentType,
  clearTemporaryAttribute,
  deleteModelAttribute,
  onChangeAttribute,
  resetEditExistingContentType,
  resetEditTempContentType,
  submitContentType,
  submitTempContentType,
} from '../App/actions';

import CustomLink from './CustomLink';

import styles from './styles.scss';
import DocumentationSection from './DocumentationSection';

/* eslint-disable react/sort-comp */
/* eslint-disable no-extra-boolean-cast */
export class ModelPage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { attrToDelete: null, removePrompt: false, showWarning: false };

  componentDidMount() {
    const { setTemporaryAttribute } = this.props;

    if (
      this.getModalType() === 'attributeForm' &&
      this.getActionType() === 'edit' &&
      !this.isTryingToEditAnUnknownAttribute()
    ) {
      setTemporaryAttribute(
        this.getAttributeName(),
        this.isUpdatingTemporaryContentType(),
        this.getModelName(),
      );
    }
  }

  componentDidUpdate(prevProps) {
    const {
      location: { search },
      match: {
        params: { modelName },
      },
      resetEditExistingContentType,
    } = prevProps;

    if (
      !this.isUpdatingTemporaryContentType(modelName) &&
      modelName !== this.props.match.params.modelName
    ) {
      resetEditExistingContentType(modelName);
    }

    if (search !== this.props.location.search) {
      this.setPrompt();
    }
  }

  getActionType = () => getQueryParameters(this.getSearch(), 'actionType');

  getAttributeName = () =>
    getQueryParameters(this.getSearch(), 'attributeName');

  getAttributeType = () =>
    getQueryParameters(this.getSearch(), 'attributeType');

  getFormData = () => {
    const { modifiedData, newContentType } = this.props;

    if (
      this.getActionType() === 'create' ||
      this.isUpdatingTemporaryContentType()
    ) {
      return newContentType;
    }

    return get(modifiedData, this.getModelName());
  };

  getModalType = () => getQueryParameters(this.getSearch(), 'modalType');

  getModel = () => {
    const { modifiedData, newContentType } = this.props;

    if (this.isUpdatingTemporaryContentType()) {
      return newContentType;
    }

    return get(modifiedData, this.getModelName(), {});
  };

  getModelAttributes = () => get(this.getModel(), 'attributes', {});

  getModelAttributesLength = () =>
    Object.keys(this.getModelAttributes()).length;

  getModelDescription = () => {
    const { initialData } = this.props;

    const description = get(
      initialData,
      [this.getModelName(), 'description'],
      null,
    );

    /* istanbul ignore if */
    /* eslint-disable indent */
    return !!description
      ? description
      : {
          id: `${pluginId}.modelPage.contentHeader.emptyDescription.description`,
        };
  };

  getModelName = () => {
    const {
      match: {
        params: { modelName },
      },
    } = this.props;

    return modelName.split('&')[0];
  };

  getModelsNumber = () => {
    const { models } = this.props;

    return models.length;
  };

  getModelRelationShips = () => {
    const attributes = this.getModelAttributes();
    const relations = pickBy(attributes, attribute => {
      return !!get(attribute, 'target', null);
    });

    return relations;
  };

  getModelRelationShipsLength = () =>
    Object.keys(this.getModelRelationShips()).length;

  getPluginHeaderActions = () => {
    const {
      initialData,
      modifiedData,
      newContentType,
      resetEditExistingContentType,
      resetEditTempContentType,
      submitContentType,
      submitTempContentType,
    } = this.props;
    /* istanbul ignore if */
    const shouldShowActions = this.isUpdatingTemporaryContentType()
      ? this.getModelAttributesLength() > 0
      : !isEqual(
          modifiedData[this.getModelName()],
          initialData[this.getModelName()],
        );
    /* eslint-disable indent */
    const handleSubmit = this.isUpdatingTemporaryContentType()
      ? () => submitTempContentType(newContentType, this.context)
      : () => {
          submitContentType(
            this.getModelName(),
            get(modifiedData, this.getModelName()),
            Object.assign(this.context, {
              history: this.props.history,
            }),
            this.getSource(),
          );
        };
    /* istanbul ignore next */
    const handleCancel = this.isUpdatingTemporaryContentType()
      ? resetEditTempContentType
      : () => resetEditExistingContentType(this.getModelName());
    /* eslint-enable indent */

    /* istanbul ignore if */
    if (shouldShowActions) {
      return [
        {
          label: `${pluginId}.form.button.cancel`,
          onClick: handleCancel,
          kind: 'secondary',
          type: 'button',
        },
        {
          label: `${pluginId}.form.button.save`,
          onClick: handleSubmit,
          kind: 'primary',
          type: 'submit',
          id: 'saveData',
        },
      ];
    }

    return [];
  };

  getPluginHeaderTitle = () => {
    const { modifiedData, newContentType } = this.props;
    const name = this.getModelName();

    /* istanbul ignore if */
    const title = this.isUpdatingTemporaryContentType()
      ? get(newContentType, 'name', null)
      : get(modifiedData, [name, 'name'], null);

    return title;
  };

  getSearch = () => {
    const {
      location: { search },
    } = this.props;

    return search;
  };

  getSectionTitle = () => {
    const base = `${pluginId}.menu.section.contentTypeBuilder.name.`;

    /* istanbul ignore if */
    return this.getModelsNumber() > 1 ? `${base}plural` : `${base}singular`;
  };

  getSource = () => {
    const {
      match: {
        params: { modelName },
      },
    } = this.props;

    const source = getQueryParameters(modelName, 'source');

    return !!source ? source : null;
  };

  handleClickEditAttribute = async (attributeName, type) => {
    const { emitEvent } = this.context;
    const {
      canOpenModal,
      history: { push },
      setTemporaryAttribute,
    } = this.props;
    const attributeType = [
      'integer',
      'biginteger',
      'float',
      'decimal',
    ].includes(type)
      ? 'number'
      : type;

    if (canOpenModal || this.isUpdatingTemporaryContentType()) {
      setTemporaryAttribute(
        attributeName,
        this.isUpdatingTemporaryContentType(),
        this.getModelName(),
      );

      await this.wait();

      emitEvent('willEditFieldOfContentType');
      push({
        search: `modalType=attributeForm&attributeType=${attributeType ||
          'relation'}&settingType=base&actionType=edit&attributeName=${attributeName}`,
      });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleClickEditModelMainInfos = async () => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    await this.wait();

    if (canOpenModal || this.isUpdatingTemporaryContentType()) {
      this.props.history.push({
        search: `modalType=model&settingType=base&actionType=edit&modelName=${this.getModelName()}`,
      });
      emitEvent('willEditNameOfContentType');
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleClickOpenModalChooseAttributes = async () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;

    await this.wait();

    if (canOpenModal || this.isUpdatingTemporaryContentType()) {
      push({ search: 'modalType=chooseAttributes' });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleClickOpenModalCreateCT = () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;

    if (canOpenModal) {
      push({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleClickOnTrashIcon = attrToDelete => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    if (canOpenModal || this.isUpdatingTemporaryContentType()) {
      this.setState({ showWarning: true, attrToDelete });
      emitEvent('willDeleteFieldOfContentType');
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleDeleteAttribute = () => {
    const { deleteModelAttribute } = this.props;
    const { attrToDelete } = this.state;

    /* istanbul ignore if */
    const keys = this.isUpdatingTemporaryContentType()
      ? ['newContentType', 'attributes', attrToDelete]
      : ['modifiedData', this.getModelName(), 'attributes', attrToDelete];

    deleteModelAttribute(keys);
    this.setState({ attrToDelete: null, showWarning: false });
  };

  handleSubmit = (shouldContinue = false) => {
    const {
      addAttributeRelation,
      addAttributeToExistingContentType,
      addAttributeToTempContentType,
      history: { push },
      location: { search },
    } = this.props;
    const attributeType = getQueryParameters(search, 'attributeType');

    if (this.getAttributeType() === 'relation') {
      addAttributeRelation(
        this.isUpdatingTemporaryContentType(),
        this.getModelName(),
      );
    } else {
      if (this.isUpdatingTemporaryContentType()) {
        addAttributeToTempContentType(attributeType);
      } else {
        addAttributeToExistingContentType(this.getModelName(), attributeType);
      }
    }
    const nextSearch = shouldContinue ? 'modalType=chooseAttributes' : '';

    push({ search: nextSearch });
  };

  handleSubmitEdit = () => {
    const {
      history: { push },
      saveEditedAttribute,
      saveEditedAttributeRelation,
    } = this.props;
    const attributeName = this.getAttributeName();

    if (this.getAttributeType() === 'relation') {
      saveEditedAttributeRelation(
        attributeName,
        this.isUpdatingTemporaryContentType(),
        this.getModelName(),
      );
    } else {
      saveEditedAttribute(
        attributeName,
        this.isUpdatingTemporaryContentType(),
        this.getModelName(),
      );
    }

    push({ search: '' });
  };

  hasModelBeenModified = () => {
    const { initialData, modifiedData } = this.props;
    const currentModel = this.getModelName();

    return (
      !isEqual(initialData[currentModel], modifiedData[currentModel]) &&
      this.getSearch() === ''
    );
  };

  isUpdatingTemporaryContentType = (modelName = this.getModelName()) => {
    const { models } = this.props;
    /* istanbul ignore next */
    const currentModel = models.find(model => model.name === modelName) || {
      isTemporary: true,
    };

    const { isTemporary } = currentModel;

    return isTemporary;
  };

  setPrompt = () => this.setState({ removePrompt: false });

  isTryingToEditAnUnknownAttribute = () => {
    const hasAttribute =
      Object.keys(this.getModelAttributes()).indexOf(
        this.getAttributeName(),
      ) !== -1;

    return (
      this.getActionType() === 'edit' &&
      this.getModalType() === 'attributeForm' &&
      !hasAttribute
    );
  };

  shouldRedirect = () => {
    const { models } = this.props;

    return (
      models.findIndex(model => model.name === this.getModelName()) === -1 ||
      this.isTryingToEditAnUnknownAttribute()
    );
  };

  toggleModalWarning = () =>
    this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  wait = async () => {
    this.setState({ removePrompt: true });
    return new Promise(resolve => setTimeout(resolve, 100));
  };

  displayNotificationCTNotSaved = () =>
    strapi.notification.info(
      `${pluginId}.notification.info.contentType.creating.notSaved`,
    );

  renderLinks = () => {
    const { models } = this.props;
    const links = models.map(model => {
      const { isTemporary, name, source } = model;
      const base = `/plugins/${pluginId}/models/${name}`;
      const to = source ? `${base}&source=${source}` : base;

      return (
        <LeftMenuLink
          key={name}
          icon="fa fa-caret-square-o-right"
          isTemporary={isTemporary}
          name={name}
          source={source}
          to={to}
        />
      );
    });

    return links;
  };

  renderLi = attribute => {
    const attributeInfos = get(this.getModelAttributes(), attribute, {});

    return (
      <AttributeLi
        key={attribute}
        name={attribute}
        attributeInfos={attributeInfos}
        onClick={this.handleClickEditAttribute}
        onClickOnTrashIcon={this.handleClickOnTrashIcon}
      />
    );
  };

  render() {
    const listTitleMessageIdBasePrefix = `${pluginId}.modelPage.contentType.list.title`;
    const {
      cancelNewContentType,
      connections,
      clearTemporaryAttribute,
      clearTemporaryAttributeRelation,
      createTempContentType,
      history: { push },
      location: { pathname, search },
      models,
      modifiedData,
      onChangeAttribute,
      onChangeExistingContentTypeMainInfos,
      onChangeNewContentTypeMainInfos,
      onChangeRelation,
      onChangeRelationNature,
      onChangeRelationTarget,
      resetExistingContentTypeMainInfos,
      resetNewContentTypeMainInfos,
      setTemporaryAttributeRelation,
      temporaryAttribute,
      temporaryAttributeRelation,
      updateTempContentType,
    } = this.props;
    const { showWarning, removePrompt } = this.state;

    if (this.shouldRedirect()) {
      const { name, source } = models[0];
      const to = source ? `${name}&source=${source}` : name;

      return <Redirect to={to} />;
    }

    const modalType = this.getModalType();
    const settingType = getQueryParameters(search, 'settingType');
    const attributeType = this.getAttributeType();
    const actionType = this.getActionType();
    const icon = this.getSource() ? null : 'fa fa-pencil';

    return (
      <div className={styles.modelpage}>
        <FormattedMessage id={`${pluginId}.prompt.content.unsaved`}>
          {msg => (
            <Prompt
              when={this.hasModelBeenModified() && !removePrompt}
              message={msg}
            />
          )}
        </FormattedMessage>
        <div className="container-fluid">
          <div className="row">
            <LeftMenu>
              <LeftMenuSection>
                <LeftMenuSectionTitle id={this.getSectionTitle()} />
                <ul>
                  {this.renderLinks()}
                  <CustomLink onClick={this.handleClickOpenModalCreateCT} />
                </ul>
              </LeftMenuSection>
              <LeftMenuSection>
                <LeftMenuSectionTitle
                  id={`${pluginId}.menu.section.documentation.name`}
                />
                <DocumentationSection />
              </LeftMenuSection>
            </LeftMenu>

            <div className="col-md-9">
              <div className={styles.componentsContainer}>
                <PluginHeader
                  description={this.getModelDescription()}
                  icon={icon}
                  title={this.getPluginHeaderTitle()}
                  actions={this.getPluginHeaderActions()}
                  onClickIcon={this.handleClickEditModelMainInfos}
                />
                {this.getModelAttributesLength() === 0 ? (
                  <EmptyAttributesBlock
                    description="content-type-builder.home.emptyAttributes.description"
                    id="openAddAttr"
                    label="content-type-builder.button.attributes.add"
                    onClick={this.handleClickOpenModalChooseAttributes}
                    title="content-type-builder.home.emptyAttributes.title"
                  />
                ) : (
                  <Block>
                    <Flex>
                      <ListTitle>
                        {this.getModelAttributesLength()}
                        &nbsp;
                        <FormattedMessage
                          id={`${listTitleMessageIdBasePrefix}.${
                            this.getModelAttributesLength() > 1
                              ? 'plural'
                              : 'singular'
                          }`}
                        />
                        {this.getModelRelationShipsLength() > 0 && (
                          <React.Fragment>
                            &nbsp;
                            <FormattedMessage
                              id={`${listTitleMessageIdBasePrefix}.including`}
                            />
                            &nbsp;
                            {this.getModelRelationShipsLength()}
                            &nbsp;
                            <FormattedMessage
                              id={`${pluginId}.modelPage.contentType.list.relationShipTitle.${
                                this.getModelRelationShipsLength() > 1
                                  ? 'plural'
                                  : 'singular'
                              }`}
                            />
                          </React.Fragment>
                        )}
                      </ListTitle>
                      <div>
                        <Button
                          label={`${pluginId}.button.attributes.add`}
                          onClick={this.handleClickOpenModalChooseAttributes}
                          secondaryHotlineAdd
                        />
                      </div>
                    </Flex>
                    <div>
                      <Ul id="attributesList">
                        {Object.keys(this.getModelAttributes()).map(
                          this.renderLi,
                        )}
                      </Ul>
                    </div>
                  </Block>
                )}
              </div>
            </div>
          </div>
        </div>
        <AttributesModalPicker
          isOpen={modalType === 'chooseAttributes'}
          push={push}
        />
        <AttributeForm
          actionType={actionType}
          activeTab={settingType}
          alreadyTakenAttributes={Object.keys(this.getModelAttributes())}
          attributeType={attributeType}
          attributeToEditName={this.getAttributeName()}
          isContentTypeTemporary={this.isUpdatingTemporaryContentType()}
          isOpen={modalType === 'attributeForm' && attributeType !== 'relation'}
          modifiedData={temporaryAttribute}
          onCancel={clearTemporaryAttribute}
          onChange={onChangeAttribute}
          onSubmit={this.handleSubmit}
          onSubmitEdit={this.handleSubmitEdit}
          push={push}
        />
        <ModelForm
          actionType={actionType}
          activeTab={settingType}
          cancelNewContentType={cancelNewContentType}
          connections={connections}
          createTempContentType={createTempContentType}
          currentData={modifiedData}
          modifiedData={this.getFormData()}
          modelToEditName={getQueryParameters(search, 'modelName')}
          onChangeExistingContentTypeMainInfos={
            onChangeExistingContentTypeMainInfos
          }
          onChangeNewContentTypeMainInfos={onChangeNewContentTypeMainInfos}
          isOpen={modalType === 'model'}
          isUpdatingTemporaryContentType={this.isUpdatingTemporaryContentType()}
          pathname={pathname}
          push={push}
          resetExistingContentTypeMainInfos={resetExistingContentTypeMainInfos}
          resetNewContentTypeMainInfos={resetNewContentTypeMainInfos}
          updateTempContentType={updateTempContentType}
        />
        <PopUpWarning
          isOpen={showWarning}
          toggleModal={this.toggleModalWarning}
          content={{
            message: `${pluginId}.popUpWarning.bodyMessage.attribute.delete`,
          }}
          popUpWarningType="danger"
          onConfirm={this.handleDeleteAttribute}
        />
        <RelationForm
          actionType={actionType}
          activeTab={settingType}
          alreadyTakenAttributes={Object.keys(this.getModelAttributes())}
          attributeToEditName={this.getAttributeName()}
          initData={setTemporaryAttributeRelation}
          isOpen={modalType === 'attributeForm' && attributeType === 'relation'}
          isUpdatingTemporaryContentType={this.isUpdatingTemporaryContentType()}
          models={models}
          modelToEditName={this.getModelName()}
          modifiedData={temporaryAttributeRelation}
          onCancel={clearTemporaryAttributeRelation}
          onChange={onChangeRelation}
          onChangeRelationNature={onChangeRelationNature}
          onChangeRelationTarget={onChangeRelationTarget}
          onSubmit={this.handleSubmit}
          onSubmitEdit={this.handleSubmitEdit}
          push={push}
          source={this.getSource()}
        />
      </div>
    );
  }
}

ModelPage.contextTypes = {
  emitEvent: PropTypes.func,
  plugins: PropTypes.object,
  router: PropTypes.object,
  updatePlugin: PropTypes.func,
};

ModelPage.defaultProps = {
  connections: ['default'],
  canOpenModal: true,
};

ModelPage.propTypes = {
  addAttributeRelation: PropTypes.func.isRequired,
  addAttributeToExistingContentType: PropTypes.func.isRequired,
  addAttributeToTempContentType: PropTypes.func.isRequired,
  cancelNewContentType: PropTypes.func.isRequired,
  canOpenModal: PropTypes.bool,
  clearTemporaryAttribute: PropTypes.func.isRequired,
  clearTemporaryAttributeRelation: PropTypes.func.isRequired,
  connections: PropTypes.array,
  createTempContentType: PropTypes.func.isRequired,
  deleteModelAttribute: PropTypes.func.isRequired,
  initialData: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
  modifiedData: PropTypes.object.isRequired,
  newContentType: PropTypes.object.isRequired,
  onChangeAttribute: PropTypes.func.isRequired,
  onChangeExistingContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeNewContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeRelation: PropTypes.func.isRequired,
  onChangeRelationNature: PropTypes.func.isRequired,
  onChangeRelationTarget: PropTypes.func.isRequired,
  resetEditExistingContentType: PropTypes.func.isRequired,
  resetEditTempContentType: PropTypes.func.isRequired,
  resetExistingContentTypeMainInfos: PropTypes.func.isRequired,
  resetNewContentTypeMainInfos: PropTypes.func.isRequired,
  saveEditedAttribute: PropTypes.func.isRequired,
  saveEditedAttributeRelation: PropTypes.func.isRequired,
  setTemporaryAttribute: PropTypes.func.isRequired,
  setTemporaryAttributeRelation: PropTypes.func.isRequired,
  submitContentType: PropTypes.func.isRequired,
  submitTempContentType: PropTypes.func.isRequired,
  temporaryAttribute: PropTypes.object.isRequired,
  temporaryAttributeRelation: PropTypes.object.isRequired,
  updateTempContentType: PropTypes.func.isRequired,
  ...routerPropTypes({ params: PropTypes.string }).isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeToExistingContentType,
      addAttributeToTempContentType,
      clearTemporaryAttribute,
      deleteModelAttribute,
      onChangeAttribute,
      resetEditExistingContentType,
      resetEditTempContentType,
      submitContentType,
      submitTempContentType,
    },
    dispatch,
  );
}

const withConnect = connect(
  null,
  mapDispatchToProps,
);

export default compose(withConnect)(ModelPage);
