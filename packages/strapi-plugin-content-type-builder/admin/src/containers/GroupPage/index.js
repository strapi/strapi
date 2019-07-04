import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import pluginId from '../../pluginId';

import ViewContainer from '../ViewContainer';
import AttributesModalPicker from '../AttributesPickerModal';

import {
  BackHeader,
  EmptyAttributesBlock,
  getQueryParameters,
} from 'strapi-helper-plugin';

/* eslint-disable no-extra-boolean-cast */
class GroupPage extends React.Component {
  featureType = 'group';

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
      ? get(newGroup, 'schema', 'description', null)
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
      : get(modifiedDataGroup, [name, 'name'], null);

    return title;
  };

  getModalType = () => getQueryParameters(this.getSearch(), 'modalType');

  getSearch = () => {
    const {
      location: { search },
    } = this.props;

    return search;
  };

  handleGoBack = () => this.props.history.goBack();

  isUpdatingTempFeature = () => {
    const { groups } = this.props;
    const currentData = groups.find(d => d.name === this.getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  render() {
    const {
      history: { push },
    } = this.props;

    return (
      <>
        <BackHeader onClick={this.handleGoBack} />
        <ViewContainer
          {...this.props}
          featureType={this.featureType}
          headerTitle={this.getFeatureHeaderTitle()}
          headerDescription={this.getFeatureHeaderDescription()}
        >
          <EmptyAttributesBlock
            description={`${pluginId}.home.emptyAttributes.description.${this.featureType}`}
            id="openAddAttr"
            label="content-type-builder.button.attributes.add"
            title="content-type-builder.home.emptyAttributes.title"
          />
        </ViewContainer>
        <AttributesModalPicker
          isOpen={this.getModalType() === 'chooseAttributes'}
          push={push}
        />
      </>
    );
  }
}

GroupPage.propTypes = {
  groups: PropTypes.array.isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
  }),
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }),
  match: PropTypes.shape({
    params: PropTypes.shape({
      groupName: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  modifiedDataGroup: PropTypes.object.isRequired,
  newGroup: PropTypes.object.isRequired,
};

export default GroupPage;
