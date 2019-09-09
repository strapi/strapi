import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, isEqual } from 'lodash';
import { Prompt } from 'react-router';

import pluginId from '../../pluginId';

import ListRow from '../../components/ListRow';

import AttributesModalPicker from '../AttributesPickerModal';
import AttributeForm from '../AttributeForm';
import ViewContainer from '../ViewContainer';
import RelationFormGroup from '../RelationFormGroup';

import {
  Button,
  EmptyAttributesBlock,
  getQueryParameters,
  List,
  ListHeader,
  ListTitle,
  ListWrapper,
  PopUpWarning,
  TrashButton,
} from 'strapi-helper-plugin';

import {
  addAttributeRelationGroup,
  addAttributeToTempGroup,
  addAttributeToExistingGroup,
  clearTemporaryAttributeGroup,
  clearTemporaryAttributeRelationGroup,
  deleteGroup,
  deleteGroupAttribute,
  deleteTemporaryGroup,
  onChangeAttributeGroup,
  onChangeRelationGroup,
  onChangeRelationNatureGroup,
  onChangeRelationTargetGroup,
  saveEditedAttributeGroup,
  saveEditedAttributeRelationGroup,
  setTemporaryAttributeGroup,
  setTemporaryAttributeRelationGroup,
  submitGroup,
  submitTempGroup,
  resetEditTempGroup,
  resetEditExistingGroup,
} from '../App/actions';

/* eslint-disable no-extra-boolean-cast */
export class GroupPage extends React.Component {
  state = {
    attrToDelete: null,
    removePrompt: false,
    showDeleteAttrWarning: false,
    showDeleteWarning: false,
  };
  featureType = 'group';

  componentDidMount() {
    const { setTemporaryAttributeGroup } = this.props;

    if (
      this.getModalType() === 'attributeForm' &&
      this.getActionType() === 'edit' &&
      !this.isTryingToEditAnUnknownAttribute()
    ) {
      setTemporaryAttributeGroup(
        this.getAttributeIndex(),
        this.isUpdatingTempFeature(),
        this.getFeatureName()
      );
    }
  }

  componentDidUpdate(prevProps) {
    const {
      location: { search },
    } = prevProps;

    if (search !== this.props.location.search) {
      this.setPrompt();
    }
  }

  displayNotificationCTNotSaved = () =>
    strapi.notification.info(
      `${pluginId}.notification.info.contentType.creating.notSaved`
    );

  isTryingToEditAnUnknownAttribute = () => {
    const hasAttribute =
      this.getFeatureAttributes().findIndex(
        attr => attr.name === this.getAttributeName()
      ) !== -1;

    return (
      this.getActionType() === 'edit' &&
      this.getModalType() === 'attributeForm' &&
      !hasAttribute
    );
  };

  getActionType = () => getQueryParameters(this.getSearch(), 'actionType');

  getAttributeIndex = () => {
    return getQueryParameters(this.getSearch(), 'attributeName');
  };

  getAttributeName = () => {
    return get(this.getFeatureAttributesNames(), this.getAttributeIndex());
  };

  getAttributeType = () =>
    getQueryParameters(this.getSearch(), 'attributeType');

  getFeature = () => {
    const { modifiedDataGroup, newGroup } = this.props;

    if (this.isUpdatingTempFeature()) {
      return newGroup;
    }
    return get(modifiedDataGroup, this.getFeatureName(), {});
  };

  getFeatureAttributes = () => get(this.getFeature(), 'attributes', []);

  getFeatureAttributesNames = () => {
    return this.getFeatureAttributes().map(attribute => {
      return attribute.name;
    });
  };

  getFeatureAttributesLength = () =>
    Object.keys(this.getFeatureAttributes()).length;

  getFeatureName = () => {
    const {
      match: {
        params: { groupName },
      },
    } = this.props;

    return groupName;
  };

  getFeatureDisplayName = () => {
    const { modifiedDataGroup, newGroup } = this.props;
    const name = this.getFeatureName();

    /* istanbul ignore if */
    const displayName = this.isUpdatingTempFeature()
      ? get(newGroup, 'name', null)
      : get(modifiedDataGroup, [name, 'name'], null);

    return displayName;
  };

  getFeatureHeaderDescription = () => {
    const { modifiedDataGroup, newGroup } = this.props;
    const name = this.getFeatureName();

    const description = this.isUpdatingTempFeature()
      ? get(newGroup, 'description', null)
      : get(modifiedDataGroup, [name, 'description'], null);

    /* istanbul ignore if */
    /* eslint-disable indent */
    return !!description
      ? description
      : {
          id: `${pluginId}.modelPage.contentHeader.emptyDescription.description`,
        };
  };

  getModalType = () => getQueryParameters(this.getSearch(), 'modalType');

  getPluginHeaderActions = () => {
    const {
      initialDataGroup,
      modifiedDataGroup,
      newGroup,
      resetEditExistingGroup,
      resetEditTempGroup,
      submitGroup,
      submitTempGroup,
    } = this.props;
    const featureName = this.getFeatureName();
    /* istanbul ignore if */
    const shouldShowActions = this.isUpdatingTempFeature()
      ? this.getFeatureAttributesLength() > 0
      : !isEqual(modifiedDataGroup[featureName], initialDataGroup[featureName]);

    const handleSubmit = () =>
      this.isUpdatingTempFeature()
        ? submitTempGroup(newGroup, this.context)
        : submitGroup(
            featureName,
            get(modifiedDataGroup, featureName),
            Object.assign(this.context, {
              history: this.props.history,
            }),
            this.getSource()
          );

    /* istanbul ignore next */
    const handleCancel = this.isUpdatingTempFeature()
      ? resetEditTempGroup
      : () => resetEditExistingGroup(this.getFeatureName());

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

  getSettingType = () => getQueryParameters(this.getSearch(), 'settingType');

  getSearch = () => {
    const {
      location: { search },
    } = this.props;

    return search;
  };

  getSource = () => {
    const source = getQueryParameters(this.getFeatureName(), 'source');

    return !!source ? source : null;
  };

  handleClickEditAttribute = async (attributeName, type) => {
    const { emitEvent } = this.context;
    const {
      canOpenModal,
      history: { push },
      setTemporaryAttributeGroup,
    } = this.props;
    const attributeType = [
      'integer',
      'biginteger',
      'float',
      'decimal',
    ].includes(type)
      ? 'number'
      : type;

    if (canOpenModal || this.isUpdatingTempFeature()) {
      setTemporaryAttributeGroup(
        attributeName,
        this.isUpdatingTempFeature(),
        this.getFeatureName()
      );

      await this.wait();

      emitEvent('willEditFieldOfGroup');

      push({
        search: `modalType=attributeForm&attributeType=${attributeType ||
          'relation'}&settingType=base&actionType=edit&attributeName=${attributeName}`,
      });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleClickOnTrashIcon = attrToDelete => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    if (canOpenModal || this.isUpdatingTempFeature()) {
      this.setState({ showDeleteAttrWarning: true, attrToDelete });
      emitEvent('willDeleteFieldOfGroup');
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleDeleteAttribute = () => {
    const { deleteGroupAttribute } = this.props;
    const { attrToDelete } = this.state;

    const keys = this.isUpdatingTempFeature()
      ? ['newGroup', 'attributes', attrToDelete]
      : [
          'modifiedDataGroup',
          this.getFeatureName(),
          'attributes',
          attrToDelete,
        ];

    deleteGroupAttribute(keys);
    this.setState({ attrToDelete: null, showDeleteAttrWarning: false });
  };

  handleSubmit = (shouldContinue = false) => {
    const {
      addAttributeRelationGroup,
      addAttributeToExistingGroup,
      addAttributeToTempGroup,
      history: { push },
    } = this.props;

    const attributeType = this.getAttributeType();

    if (this.getAttributeType() === 'relation') {
      addAttributeRelationGroup(
        this.isUpdatingTempFeature(),
        this.getFeatureName()
      );
    } else {
      if (this.isUpdatingTempFeature()) {
        addAttributeToTempGroup(attributeType);
      } else {
        addAttributeToExistingGroup(this.getFeatureName(), attributeType);
      }
    }

    const nextSearch = shouldContinue ? 'modalType=chooseAttributes' : '';

    push({ search: nextSearch });
  };

  handleSubmitEdit = (shouldContinue = false) => {
    const {
      history: { push },
      saveEditedAttributeGroup,
      saveEditedAttributeRelationGroup,
    } = this.props;

    if (this.getAttributeType() === 'relation') {
      saveEditedAttributeRelationGroup(
        this.getAttributeIndex(),
        this.isUpdatingTempFeature(),
        this.getFeatureName()
      );
    } else {
      saveEditedAttributeGroup(
        this.getAttributeIndex(),
        this.isUpdatingTempFeature(),
        this.getFeatureName()
      );
    }

    const nextSearch = shouldContinue ? 'modalType=chooseAttributes' : '';

    push({ search: nextSearch });
  };

  hasFeatureBeenModified = () => {
    const { initialDataGroup, modifiedDataGroup } = this.props;
    const currentGroup = this.getFeatureName();

    return (
      !isEqual(
        initialDataGroup[currentGroup],
        modifiedDataGroup[currentGroup]
      ) && this.getSearch() === ''
    );
  };

  isUpdatingTempFeature = () => {
    const { groups } = this.props;
    const currentData = groups.find(d => d.name === this.getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  openAttributesModal = async () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;

    await this.wait();

    if (canOpenModal || this.isUpdatingTempFeature()) {
      push({ search: 'modalType=chooseAttributes' });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  openEditFeatureModal = async () => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    await this.wait();

    if (canOpenModal || this.isUpdatingTempFeature()) {
      this.props.history.push({
        search: `modalType=group&settingType=base&actionType=edit&groupName=${this.getFeatureName()}`,
      });
      emitEvent('willEditNameOfGroup');
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  setPrompt = () => this.setState({ removePrompt: false });

  shouldRedirect = () => {
    const { groups } = this.props;

    return (
      groups.findIndex(
        group => (group.uid || group.name) === this.getFeatureName()
      ) === -1
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

  renderListRow = (attribute, index) => {
    return (
      <ListRow
        {...attribute}
        attributeId={index}
        context={this.context}
        name={attribute.name}
        onClick={this.handleClickEditAttribute}
        onClickDelete={this.handleClickOnTrashIcon}
        key={attribute.name}
      />
    );
  };

  render() {
    const {
      canOpenModal,
      clearTemporaryAttributeGroup,
      clearTemporaryAttributeRelationGroup,
      deleteGroup,
      deleteTemporaryGroup,
      history: { push },
      groups,
      models,
      onChangeAttributeGroup,
      onChangeRelationGroup,
      onChangeRelationNatureGroup,
      onChangeRelationTargetGroup,
      temporaryAttributeGroup,
      temporaryAttributeRelationGroup,
      setTemporaryAttributeRelationGroup,
    } = this.props;
    const {
      showDeleteAttrWarning,
      showDeleteWarning,
      removePrompt,
    } = this.state;

    if (this.shouldRedirect()) {
      if (groups[0]) {
        const { uid, source } = groups[0];
        const to = source ? `${uid}&source=${source}` : uid;

        return <Redirect to={to} />;
      }

      const { name, source } = models[0];
      const base = `/plugins/${pluginId}/models/${name}`;
      const to = source ? `${base}&source=${source}` : base;

      return <Redirect to={to} />;
    }

    const attributes = this.getFeatureAttributes();
    const attributesNumber = this.getFeatureAttributesLength();

    const title = [
      {
        label: `${pluginId}.table.attributes.title.${
          attributesNumber > 1 ? 'plural' : 'singular'
        }`,
        values: { number: attributesNumber },
      },
    ];

    const buttonProps = {
      kind: 'secondaryHotlineAdd',
      label: `${pluginId}.button.attributes.add.another`,
      onClick: () => this.openAttributesModal(),
    };

    return (
      <>
        <FormattedMessage id={`${pluginId}.prompt.content.unsaved`}>
          {msg => (
            <Prompt
              when={this.hasFeatureBeenModified() && !removePrompt}
              message={msg}
            />
          )}
        </FormattedMessage>
        <ViewContainer
          {...this.props}
          featureType={this.featureType}
          headerTitle={this.getFeatureDisplayName()}
          headerDescription={this.getFeatureHeaderDescription()}
          pluginHeaderActions={this.getPluginHeaderActions()}
          onClickIcon={this.openEditFeatureModal}
        >
          {attributesNumber === 0 ? (
            <EmptyAttributesBlock
              description={`${pluginId}.home.emptyAttributes.description.${this.featureType}`}
              id="openAddAttr"
              label={`${pluginId}.button.attributes.add`}
              title={`${pluginId}.home.emptyAttributes.title`}
              onClick={this.openAttributesModal}
            />
          ) : (
            <ListWrapper>
              <ListHeader
                button={{
                  ...buttonProps,
                  style: {
                    right: '15px',
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
                    {attributes.map((attribute, index) =>
                      this.renderListRow(attribute, index)
                    )}
                  </tbody>
                </table>
              </List>
              <div className="list-button">
                <Button {...buttonProps} />
              </div>
            </ListWrapper>
          )}
          <div className="trash-btn-wrapper">
            <TrashButton
              onClick={e => {
                e.stopPropagation();

                if (canOpenModal || this.isUpdatingTempFeature()) {
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
        </ViewContainer>

        <AttributesModalPicker
          featureType={this.featureType}
          featureName={this.getFeatureDisplayName()}
          isOpen={this.getModalType() === 'chooseAttributes'}
          push={push}
        />

        <AttributeForm
          actionType={this.getActionType()}
          activeTab={this.getSettingType()}
          alreadyTakenAttributes={this.getFeatureAttributesNames()}
          attributeType={this.getAttributeType()}
          attributeToEditIndex={this.getAttributeIndex()}
          attributeToEditName={this.getAttributeName()}
          featureName={this.getFeatureDisplayName()}
          featureType={this.featureType}
          isOpen={
            this.getModalType() === 'attributeForm' &&
            this.getAttributeType() !== 'relation'
          }
          modifiedData={temporaryAttributeGroup}
          onCancel={clearTemporaryAttributeGroup}
          onChange={onChangeAttributeGroup}
          onSubmit={this.handleSubmit}
          onSubmitEdit={this.handleSubmitEdit}
          push={push}
        />

        <RelationFormGroup
          actionType={this.getActionType()}
          activeTab={this.getSettingType()}
          alreadyTakenAttributes={this.getFeatureAttributesNames()}
          attributeToEditIndex={parseInt(this.getAttributeIndex(), 10)}
          attributeToEditName={this.getAttributeName()}
          featureName={this.getFeatureDisplayName()}
          featureType={this.featureType}
          featureToEditName={this.getFeatureName()}
          features={models}
          isOpen={
            this.getModalType() === 'attributeForm' &&
            this.getAttributeType() === 'relation'
          }
          isUpdatingTemporary={this.isUpdatingTempFeature()}
          modifiedData={temporaryAttributeRelationGroup}
          onCancel={clearTemporaryAttributeRelationGroup}
          onChange={onChangeRelationGroup}
          onChangeRelationNature={onChangeRelationNatureGroup}
          onChangeRelationTarget={onChangeRelationTargetGroup}
          onSubmit={this.handleSubmit}
          onSubmitEdit={this.handleSubmitEdit}
          setTempAttribute={setTemporaryAttributeRelationGroup}
          push={push}
          source={this.getSource()}
        />

        <PopUpWarning
          isOpen={showDeleteWarning}
          toggleModal={this.toggleDeleteModalWarning}
          content={{
            message: `${pluginId}.popUpWarning.bodyMessage.groups.delete`,
          }}
          type="danger"
          onConfirm={() => {
            if (this.isUpdatingTempFeature()) {
              deleteTemporaryGroup();
            } else {
              deleteGroup(this.getFeatureName(), this.context);
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
      </>
    );
  }
}

GroupPage.contextTypes = {
  emitEvent: PropTypes.func,
};

GroupPage.defaultProps = {
  canOpenModal: true,
};

GroupPage.propTypes = {
  addAttributeRelationGroup: PropTypes.func.isRequired,
  addAttributeToExistingGroup: PropTypes.func.isRequired,
  addAttributeToTempGroup: PropTypes.func.isRequired,
  canOpenModal: PropTypes.bool,
  clearTemporaryAttributeGroup: PropTypes.func.isRequired,
  clearTemporaryAttributeRelationGroup: PropTypes.func.isRequired,
  deleteGroup: PropTypes.func.isRequired,
  deleteGroupAttribute: PropTypes.func.isRequired,
  deleteTemporaryGroup: PropTypes.func.isRequired,
  groups: PropTypes.array.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }),
  initialDataGroup: PropTypes.object.isRequired,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
    pathname: PropTypes.string.isRequired,
  }),
  match: PropTypes.shape({
    params: PropTypes.shape({
      groupName: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  models: PropTypes.array.isRequired,
  modifiedDataGroup: PropTypes.object.isRequired,
  newGroup: PropTypes.object.isRequired,
  onChangeAttributeGroup: PropTypes.func.isRequired,
  onChangeRelationGroup: PropTypes.func.isRequired,
  onChangeRelationNatureGroup: PropTypes.func.isRequired,
  onChangeRelationTargetGroup: PropTypes.func.isRequired,
  resetEditExistingGroup: PropTypes.func.isRequired,
  resetEditTempGroup: PropTypes.func.isRequired,
  saveEditedAttributeGroup: PropTypes.func.isRequired,
  saveEditedAttributeRelationGroup: PropTypes.func.isRequired,
  setTemporaryAttributeGroup: PropTypes.func.isRequired,
  setTemporaryAttributeRelationGroup: PropTypes.func.isRequired,
  submitGroup: PropTypes.func.isRequired,
  submitTempGroup: PropTypes.func.isRequired,
  temporaryAttributeGroup: PropTypes.object.isRequired,
  temporaryAttributeRelationGroup: PropTypes.object.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeRelationGroup,
      addAttributeToExistingGroup,
      addAttributeToTempGroup,
      clearTemporaryAttributeGroup,
      clearTemporaryAttributeRelationGroup,
      deleteGroup,
      deleteGroupAttribute,
      deleteTemporaryGroup,
      onChangeAttributeGroup,
      onChangeRelationGroup,
      onChangeRelationNatureGroup,
      onChangeRelationTargetGroup,
      saveEditedAttributeGroup,
      saveEditedAttributeRelationGroup,
      setTemporaryAttributeGroup,
      setTemporaryAttributeRelationGroup,
      submitGroup,
      submitTempGroup,
      resetEditExistingGroup,
      resetEditTempGroup,
    },
    dispatch
  );
}

const withConnect = connect(
  null,
  mapDispatchToProps
);

export default compose(withConnect)(GroupPage);
