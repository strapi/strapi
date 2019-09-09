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
  List,
  ListHeader,
  ListTitle,
  ListWrapper,
  PopUpWarning,
  TrashButton,
  routerPropTypes,
  getQueryParameters,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import ListRowCollapse from '../../components/ListRowCollapse';

import AttributeForm from '../AttributeForm';
import AttributesModalPicker from '../AttributesPickerModal';
import RelationForm from '../RelationForm';
import ViewContainer from '../ViewContainer';

import {
  addAttributeToExistingContentType,
  addAttributeToTempContentType,
  clearTemporaryAttribute,
  deleteModel,
  deleteModelAttribute,
  deleteTemporaryModel,
  onChangeAttribute,
  resetEditExistingContentType,
  resetEditTempContentType,
  submitContentType,
  submitTempContentType,
} from '../App/actions';

import styles from './styles.scss';

/* eslint-disable react/sort-comp */
/* eslint-disable no-extra-boolean-cast */
export class ModelPage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = {
    attrToDelete: null,
    removePrompt: false,
    showDeleteAttrWarning: false,
    showDeleteWarning: false,
  };
  featureType = 'model';

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
        this.getModelName()
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

  // getFormData = () => {
  //   const { modifiedData, newContentType } = this.props;

  //   if (
  //     this.getActionType() === 'create' ||
  //     this.isUpdatingTemporaryContentType()
  //   ) {
  //     return newContentType;
  //   }

  //   return get(modifiedData, this.getModelName());
  // };

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
      null
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
          initialData[this.getModelName()]
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
            this.getSource()
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
        this.getModelName()
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
      this.setState({ showDeleteAttrWarning: true, attrToDelete });
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
    this.setState({ attrToDelete: null, showDeleteAttrWarning: false });
  };

  handleRedirectToGroup = group => {
    const {
      history: { push },
    } = this.props;
    const { source, uid } = group;

    const base = `/plugins/${pluginId}/groups/${uid}`;
    const to = source ? `${base}&source=${source}` : base;

    push(to);
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
        this.getModelName()
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

  handleSubmitEdit = (shouldContinue = false) => {
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
        this.getModelName()
      );
    } else {
      saveEditedAttribute(
        attributeName,
        this.isUpdatingTemporaryContentType(),
        this.getModelName()
      );
    }

    const nextSearch = shouldContinue ? 'modalType=chooseAttributes' : '';

    push({ search: nextSearch });
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
        this.getAttributeName()
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

  toggleDeleteAttrModalWarning = () =>
    this.setState(prevState => ({
      showDeleteAttrWarning: !prevState.showDeleteAttrWarning,
    }));

  toggleDeleteModalWarning = () =>
    this.setState(prevState => ({
      showDeleteWarning: !prevState.showDeleteWarning,
    }));

  wait = async () => {
    this.setState({ removePrompt: true });
    return new Promise(resolve => setTimeout(resolve, 100));
  };

  displayNotificationCTNotSaved = () =>
    strapi.notification.info(
      `${pluginId}.notification.info.contentType.creating.notSaved`
    );

  renderListRow = attribute => {
    const { canOpenModal, modifiedDataGroup } = this.props;
    const attributeInfos = get(this.getModelAttributes(), attribute, {});

    return (
      <ListRowCollapse
        {...attributeInfos}
        attributeId={attribute}
        canOpenModal={canOpenModal}
        groups={modifiedDataGroup}
        name={attribute}
        onClick={this.handleClickEditAttribute}
        onClickDelete={this.handleClickOnTrashIcon}
        onClickGoTo={this.handleRedirectToGroup}
        key={attribute}
      />
    );
  };

  render() {
    const {
      canOpenModal,
      clearTemporaryAttribute,
      clearTemporaryAttributeRelation,
      deleteModel,
      deleteTemporaryModel,
      history: { push },
      groups,
      location: { search },
      models,
      onChangeAttribute,
      onChangeRelation,
      onChangeRelationNature,
      onChangeRelationTarget,
      setTemporaryAttributeRelation,
      temporaryAttribute,
      temporaryAttributeRelation,
    } = this.props;
    const {
      showDeleteAttrWarning,
      showDeleteWarning,
      removePrompt,
    } = this.state;

    if (this.shouldRedirect()) {
      const { name, source } = models[0];
      const to = source ? `${name}&source=${source}` : name;

      return <Redirect to={to} />;
    }

    const modalType = this.getModalType();
    const settingType = getQueryParameters(search, 'settingType');
    const attributeType = this.getAttributeType();
    const actionType = this.getActionType();

    const attributesNumber = this.getModelAttributesLength();
    const relationsNumber = this.getModelRelationShipsLength();

    let title = [
      {
        label: `${pluginId}.table.attributes.title.${
          attributesNumber > 1 ? 'plural' : 'singular'
        }`,
        values: { number: attributesNumber },
      },
    ];

    if (relationsNumber > 0) {
      title.push({
        label: `${pluginId}.table.relations.title.${
          relationsNumber > 1 ? 'plural' : 'singular'
        }`,
        values: { number: relationsNumber },
      });
    }

    const buttonProps = {
      kind: 'secondaryHotlineAdd',
      label: `${pluginId}.button.attributes.add.another`,
      onClick: () => this.handleClickOpenModalChooseAttributes(),
    };

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
        <ViewContainer
          {...this.props}
          featureType={this.featureType}
          headerTitle={this.getPluginHeaderTitle()}
          headerDescription={this.getModelDescription()}
          pluginHeaderActions={this.getPluginHeaderActions()}
          onClickIcon={this.handleClickEditModelMainInfos}
        >
          {attributesNumber === 0 ? (
            <EmptyAttributesBlock
              description="content-type-builder.home.emptyAttributes.description"
              id="openAddAttr"
              label="content-type-builder.button.attributes.add"
              onClick={this.handleClickOpenModalChooseAttributes}
              title="content-type-builder.home.emptyAttributes.title"
            />
          ) : (
            <ListWrapper>
              <ListHeader
                button={{
                  ...buttonProps,
                  style: {
                    position: 'absolute',
                    top: '1.8rem',
                    right: '10px',
                    outline: 0,
                  },
                }}
              >
                <div className="list-header-title">
                  {title.map(item => {
                    return (
                      <FormattedMessage
                        key={item.label}
                        id={item.label}
                        values={item.values}
                      >
                        {msg => <ListTitle>{msg}&nbsp;</ListTitle>}
                      </FormattedMessage>
                    );
                  })}
                </div>
              </ListHeader>
              <List>
                <table>
                  <tbody>
                    {Object.keys(this.getModelAttributes()).map(
                      this.renderListRow
                    )}
                  </tbody>
                </table>
              </List>
              <div className="list-button">
                <Button {...buttonProps} />
              </div>
            </ListWrapper>
          )}
          {!this.getSource() && (
            <div className="trash-btn-wrapper">
              <TrashButton
                onClick={e => {
                  e.stopPropagation();

                  if (canOpenModal || this.isUpdatingTemporaryContentType()) {
                    this.toggleDeleteModalWarning(true);
                  } else {
                    strapi.notification.info(
                      `${pluginId}.notification.info.work.notSaved`
                    );
                  }
                }}
              >
                <div>
                  <FormattedMessage id={`${pluginId}.button.delete.title`} />
                </div>
                <FormattedMessage id={`${pluginId}.button.delete.label`} />
              </TrashButton>
            </div>
          )}
        </ViewContainer>

        <AttributesModalPicker
          featureName={this.getModelName()}
          isOpen={modalType === 'chooseAttributes'}
          push={push}
        />
        <AttributeForm
          actionType={actionType}
          activeTab={settingType}
          alreadyTakenAttributes={Object.keys(this.getModelAttributes())}
          attributeType={attributeType}
          attributeOptions={attributeType === 'group' ? groups : null}
          attributeToEditName={this.getAttributeName()}
          featureName={this.getModelName()}
          isContentTypeTemporary={this.isUpdatingTemporaryContentType()}
          isOpen={modalType === 'attributeForm' && attributeType !== 'relation'}
          modifiedData={temporaryAttribute}
          onCancel={clearTemporaryAttribute}
          onChange={onChangeAttribute}
          onSubmit={this.handleSubmit}
          onSubmitEdit={this.handleSubmitEdit}
          push={push}
        />

        <RelationForm
          actionType={actionType}
          activeTab={settingType}
          alreadyTakenAttributes={Object.keys(this.getModelAttributes())}
          attributeToEditName={this.getAttributeName()}
          featureName={this.getModelName()}
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

        <PopUpWarning
          isOpen={showDeleteWarning}
          toggleModal={this.toggleDeleteModalWarning}
          content={{
            message: `${pluginId}.popUpWarning.bodyMessage.contentType.delete`,
          }}
          type="danger"
          onConfirm={() => {
            if (this.isUpdatingTemporaryContentType()) {
              deleteTemporaryModel();
            } else {
              deleteModel(this.getModelName(), this.context);
            }
            this.toggleDeleteModalWarning(false);
          }}
        />

        <PopUpWarning
          isOpen={showDeleteAttrWarning}
          toggleModal={this.toggleDeleteAttrModalWarning}
          content={{
            message: `${pluginId}.popUpWarning.bodyMessage.attribute.delete`,
          }}
          popUpWarningType="danger"
          onConfirm={this.handleDeleteAttribute}
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
  deleteModel: PropTypes.func.isRequired,
  deleteModelAttribute: PropTypes.func.isRequired,
  deleteTemporaryModel: PropTypes.func.isRequired,
  initialData: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
  modifiedData: PropTypes.object.isRequired,
  newContentType: PropTypes.object.isRequired,
  onChangeAttribute: PropTypes.func.isRequired,
  onChangeRelation: PropTypes.func.isRequired,
  onChangeRelationNature: PropTypes.func.isRequired,
  onChangeRelationTarget: PropTypes.func.isRequired,
  resetEditExistingContentType: PropTypes.func.isRequired,
  resetEditTempContentType: PropTypes.func.isRequired,
  saveEditedAttribute: PropTypes.func.isRequired,
  saveEditedAttributeRelation: PropTypes.func.isRequired,
  setTemporaryAttribute: PropTypes.func.isRequired,
  setTemporaryAttributeRelation: PropTypes.func.isRequired,
  submitContentType: PropTypes.func.isRequired,
  submitTempContentType: PropTypes.func.isRequired,
  temporaryAttribute: PropTypes.object.isRequired,
  temporaryAttributeRelation: PropTypes.object.isRequired,
  ...routerPropTypes({ params: PropTypes.string }).isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeToExistingContentType,
      addAttributeToTempContentType,
      clearTemporaryAttribute,
      deleteModel,
      deleteModelAttribute,
      deleteTemporaryModel,
      onChangeAttribute,
      resetEditExistingContentType,
      resetEditTempContentType,
      submitContentType,
      submitTempContentType,
    },
    dispatch
  );
}

const withConnect = connect(
  null,
  mapDispatchToProps
);

export default compose(withConnect)(ModelPage);
