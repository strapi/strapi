import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, isEqual } from 'lodash';

import pluginId from '../../pluginId';

import ListRow from '../../components/ListRow';

import AttributesModalPicker from '../AttributesPickerModal';
import AttributeForm from '../AttributeForm';
import ViewContainer from '../ViewContainer';

import {
  BackHeader,
  Button,
  EmptyAttributesBlock,
  getQueryParameters,
  List,
  ListHeader,
  ListTitle,
  ListWrapper,
  PopUpWarning,
} from 'strapi-helper-plugin';

import {
  addAttributeToTempGroup,
  addAttributeToExistingGroup,
  clearTemporaryAttributeGroup,
  deleteGroupAttribute,
  onChangeAttributeGroup,
  saveEditedAttributeGroup,
  setTemporaryAttributeGroup,
  submitGroup,
  submitTempGroup,
  resetEditTempGroup,
} from '../App/actions';

/* eslint-disable no-extra-boolean-cast */
export class GroupPage extends React.Component {
  state = { attrToDelete: null, showWarning: false };
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

  getFeatureSchema = () => get(this.getFeature(), 'schema', {});

  getFeatureAttributes = () => get(this.getFeatureSchema(), 'attributes', []);

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

  getFeatureHeaderDescription = () => {
    const { modifiedDataGroup, newGroup } = this.props;
    const name = this.getFeatureName();

    const description = this.isUpdatingTempFeature()
      ? get(newGroup, ['schema', 'description'], null)
      : get(modifiedDataGroup, [name, 'schema', 'description'], null);

    /* istanbul ignore if */
    /* eslint-disable indent */
    return !!description
      ? description
      : {
          id: `${pluginId}.modelPage.contentHeader.emptyDescription.description`,
        };
  };

  getFeatureHeaderTitle = () => {
    const { modifiedDataGroup, newGroup } = this.props;
    const name = this.getFeatureName();

    /* istanbul ignore if */
    const title = this.isUpdatingTempFeature()
      ? get(newGroup, 'name', null)
      : get(modifiedDataGroup, [name, 'schema', 'name'], null);

    return title;
  };

  getModalType = () => getQueryParameters(this.getSearch(), 'modalType');

  getPluginHeaderActions = () => {
    const {
      initialDataGroup,
      modifiedDataGroup,
      newGroup,
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
            get(modifiedDataGroup, [featureName, 'schema']),
            Object.assign(this.context, {
              history: this.props.history,
            }),
            this.getSource()
          );

    const handleCancel = resetEditTempGroup;

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

  handleClickEditAttribute = (attributeIndex, type) => {
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
        attributeIndex,
        this.isUpdatingTempFeature(),
        this.getFeatureName()
      );

      emitEvent('willEditFieldOfGroup');

      push({
        search: `modalType=attributeForm&attributeType=${attributeType}&settingType=base&actionType=edit&attributeName=${attributeIndex}`,
      });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleClickOnTrashIcon = attrToDelete => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    if (canOpenModal || this.isUpdatingTempFeature()) {
      this.setState({ showWarning: true, attrToDelete });
      emitEvent('willDeleteFieldOfGroup');
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  handleDeleteAttribute = () => {
    const { deleteGroupAttribute } = this.props;
    const { attrToDelete } = this.state;

    const keys = this.isUpdatingTempFeature()
      ? ['newGroup', 'schema', 'attributes', attrToDelete]
      : [
          'modifiedDataGroup',
          this.getFeatureName(),
          'schema',
          'attributes',
          attrToDelete,
        ];

    deleteGroupAttribute(keys);
    this.setState({ attrToDelete: null, showWarning: false });
  };

  handleGoBack = () => {
    const {
      location: { pathname },
    } = this.props;
    const backPathname = pathname.substr(0, pathname.lastIndexOf('/'));

    this.props.history.push(backPathname);
  };

  handleSubmit = (shouldContinue = false) => {
    const {
      addAttributeToExistingGroup,
      addAttributeToTempGroup,
      history: { push },
    } = this.props;

    const attributeType = this.getAttributeType();

    if (this.isUpdatingTempFeature()) {
      addAttributeToTempGroup(attributeType);
    } else {
      addAttributeToExistingGroup(this.getFeatureName(), attributeType);
    }

    const nextSearch = shouldContinue ? 'modalType=chooseAttributes' : '';

    push({ search: nextSearch });
  };

  handleSubmitEdit = (shouldContinue = false) => {
    const {
      history: { push },
      saveEditedAttributeGroup,
    } = this.props;

    saveEditedAttributeGroup(
      this.getAttributeIndex(),
      this.isUpdatingTempFeature(),
      this.getFeatureName()
    );

    const nextSearch = shouldContinue ? 'modalType=chooseAttributes' : '';

    push({ search: nextSearch });
  };

  isUpdatingTempFeature = () => {
    const { groups } = this.props;
    const currentData = groups.find(d => d.name === this.getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  openAttributesModal = () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;

    if (canOpenModal || this.isUpdatingTempFeature()) {
      push({ search: 'modalType=chooseAttributes' });
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  openEditFeatureModal = () => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    if (canOpenModal || this.isUpdatingTempFeature()) {
      this.props.history.push({
        search: `modalType=group&settingType=base&actionType=edit&groupName=${this.getFeatureName()}`,
      });
      emitEvent('willEditNameOfGroup');
    } else {
      this.displayNotificationCTNotSaved();
    }
  };

  toggleModalWarning = () =>
    this.setState(prevState => ({ showWarning: !prevState.showWarning }));

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
      clearTemporaryAttributeGroup,
      history: { push },
      onChangeAttributeGroup,
      temporaryAttributeGroup,
    } = this.props;

    const { showWarning } = this.state;

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
      label: `${pluginId}.button.attributes.add`,
      onClick: () => this.openAttributesModal(),
    };

    return (
      <>
        <BackHeader onClick={this.handleGoBack} />
        <ViewContainer
          {...this.props}
          featureType={this.featureType}
          headerTitle={this.getFeatureHeaderTitle()}
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
              <ListHeader button={{ ...buttonProps }}>
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
        </ViewContainer>

        <AttributesModalPicker
          featureType={this.featureType}
          isOpen={this.getModalType() === 'chooseAttributes'}
          push={push}
        />

        <AttributeForm
          actionType={this.getActionType()}
          activeTab={this.getSettingType()}
          alreadyTakenAttributes={this.getFeatureAttributesNames()}
          attributeType={this.getAttributeType()}
          attributeToEditName={this.getAttributeName()}
          featureType={this.featureType}
          isOpen={this.getModalType() === 'attributeForm'}
          modifiedData={temporaryAttributeGroup}
          onCancel={clearTemporaryAttributeGroup}
          onChange={onChangeAttributeGroup}
          onSubmit={this.handleSubmit}
          onSubmitEdit={this.handleSubmitEdit}
          push={push}
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
  addAttributeToExistingGroup: PropTypes.func.isRequired,
  addAttributeToTempGroup: PropTypes.func.isRequired,
  canOpenModal: PropTypes.bool,
  clearTemporaryAttributeGroup: PropTypes.func.isRequired,
  deleteGroupAttribute: PropTypes.func.isRequired,
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
  modifiedDataGroup: PropTypes.object.isRequired,
  newGroup: PropTypes.object.isRequired,
  onChangeAttributeGroup: PropTypes.func.isRequired,
  resetEditTempGroup: PropTypes.func.isRequired,
  saveEditedAttributeGroup: PropTypes.func.isRequired,
  setTemporaryAttributeGroup: PropTypes.func.isRequired,
  submitGroup: PropTypes.func.isRequired,
  submitTempGroup: PropTypes.func.isRequired,
  temporaryAttributeGroup: PropTypes.object.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeToExistingGroup,
      addAttributeToTempGroup,
      clearTemporaryAttributeGroup,
      deleteGroupAttribute,
      onChangeAttributeGroup,
      saveEditedAttributeGroup,
      setTemporaryAttributeGroup,
      submitGroup,
      submitTempGroup,
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
