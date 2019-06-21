import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Prompt } from 'react-router';
import { get, isEqual, capitalize } from 'lodash';

import pluginId from '../../pluginId';

import ViewContainer from '../ViewContainer';
import AttributesModalPicker from '../AttributesPickerModal';

import { submitGroup, submitTempGroup } from '../App/actions';

import { EmptyAttributesBlock, getQueryParameters } from 'strapi-helper-plugin';

class GroupPage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { attrToDelete: null, removePrompt: true, showWarning: false };
  featureType = 'group';

  getFeature = () => {
    const { modifiedDataGroup, newGroup } = this.props;

    if (this.isUpdatingTempFeature()) {
      return newGroup;
    }

    return get(modifiedDataGroup, this.getFeatureName(), {});
  };

  getFeatureAttributes = () => {
    return get(this.getFeature(), 'schema', 'attributes', {});
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

    /* istanbul ignore if */
    const description = this.isUpdatingTempFeature()
      ? get(newGroup, 'schema', 'description', null)
      : get(modifiedDataGroup, [name, 'schema', 'description'], null);

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
      : get(modifiedDataGroup, [name, 'name'], null);

    return title;
  };

  getModalType = () => getQueryParameters(this.getSearch(), 'modalType');

  getPluginHeaderActions = () => {
    const { modifiedDataGroup, initialDataGroup } = this.props;
    // console.log(this.getFeatureAttributesLength());
    // console.log(this.getFeatureAttributes());

    /* istanbul ignore if */
    const shouldShowActions = this.isUpdatingTempFeature()
      ? this.getFeatureAttributesLength() > 0
      : !isEqual(
          modifiedDataGroup[this.getFeatureName()],
          initialDataGroup[this.getFeatureName()]
        );

    if (shouldShowActions) {
      return [
        {
          label: `${pluginId}.form.button.cancel`,
          onClick: () => {},
          kind: 'secondary',
          type: 'button',
        },
        {
          label: `${pluginId}.form.button.save`,
          onClick: () => {},
          kind: 'primary',
          type: 'submit',
          id: 'saveData',
        },
      ];
    }

    return [];
  };

  getSearch = () => {
    const {
      location: { search },
    } = this.props;

    return search;
  };

  getSource = () => {
    const source = getQueryParameters(getFeatureName(), 'source');

    return !!source ? source : null;
  };

  handleClickIcon = async () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;
    const { emitEvent } = this.context;

    await this.wait();

    if (canOpenModal || this.isUpdatingTempFeature()) {
      push({
        search: `modalType=${
          this.featureType
        }&settingType=base&actionType=edit&modelName=${this.getFeatureName()}`,
      });
      emitEvent(`willEditNameOf${capitalize(this.featureType)}`);
    } else {
      displayNotificationCTNotSaved();
    }
  };

  handleClickOpenModalChooseAttributes = async () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;

    await this.wait();

    if (canOpenModal || this.isUpdatingTempFeature()) {
      push({ search: 'modalType=chooseAttributes' });
    } else {
      displayNotificationCTNotSaved();
    }
  };

  hasGroupBeenModified = () => {
    const { initialDataGroup, modifiedDataGroup } = this.props;
    const currentModel = this.getFeatureName();

    return (
      !isEqual(
        initialDataGroup[currentModel],
        modifiedDataGroup[currentModel]
      ) && this.getSearch() === ''
    );
  };

  isUpdatingTempFeature = () => {
    const { groups } = this.props;
    const currentData = groups.find(d => d.name === this.getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  setPrompt = () => this.setState({ removePrompt: false });

  removePrompt = () => this.setState({ removePrompt: true });

  wait = async () => {
    this.removePrompt();
    return new Promise(resolve => setTimeout(resolve, 100));
  };

  render() {
    const {
      groups,
      history: { push },
      modifiedDataGroup,
      newGroup,
      temporaryAttribute,
    } = this.props;
    const { removePrompt } = this.state;

    return (
      <div>
        <FormattedMessage id={`${pluginId}.prompt.content.unsaved`}>
          {msg => (
            <Prompt
              when={this.hasGroupBeenModified() && !removePrompt}
              message={msg}
            />
          )}
        </FormattedMessage>
        <ViewContainer
          {...this.props}
          featureType={this.featureType}
          handleClickIcon={this.handleClickIcon}
          headerTitle={this.getFeatureHeaderTitle()}
          headerDescription={this.getFeatureHeaderDescription()}
          modifiedData={modifiedDataGroup}
          newFeature={newGroup}
          tempData={temporaryAttribute}
          pluginHeaderActions={this.getPluginHeaderActions()}
          removePrompt={this.removePrompt}
          submitFeature={submitGroup}
          submitTempFeature={submitTempGroup}
        >
          {this.getFeatureAttributesLength() === 0 ? (
            <EmptyAttributesBlock
              description={`${pluginId}.home.emptyAttributes.description.${
                this.featureType
              }`}
              id="openAddAttr"
              label="content-type-builder.button.attributes.add"
              onClick={this.handleClickOpenModalChooseAttributes}
              title="content-type-builder.home.emptyAttributes.title"
            />
          ) : (
            <>
              <p>GROUPS LIST</p>
              {groups.map(group => {
                <p>{group.name}</p>;
              })}
            </>
          )}
        </ViewContainer>
        <AttributesModalPicker
          isOpen={this.getModalType() === 'chooseAttributes'}
          push={push}
        />
      </div>
    );
  }
}

GroupPage.contextTypes = {
  emitEvent: PropTypes.func,
};

GroupPage.protoType = {
  initialDataGroup: PropTypes.object.isRequired,
  resetEditTempGroup: PropTypes.func.isRequired,
};

export default GroupPage;
