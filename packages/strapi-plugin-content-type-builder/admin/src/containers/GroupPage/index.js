import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, pickBy } from 'lodash';

import pluginId from '../../pluginId';

import ViewContainer from '../ViewContainer';
import AttributesModalPicker from '../AttributesPickerModal';

import ListRow from '../../components/ListRow';

import {
  BackHeader,
  Button,
  EmptyAttributesBlock,
  getQueryParameters,
  ListWrapper,
  ListHeader,
  List,
} from 'strapi-helper-plugin';

import { deleteGroupAttribute } from '../App/actions';

/* eslint-disable no-extra-boolean-cast */
export class GroupPage extends React.Component {
  featureType = 'group';

  getFeature = () => {
    const { modifiedDataGroup, newGroup } = this.props;

    if (this.isUpdatingTempFeature()) {
      return newGroup;
    }

    return get(modifiedDataGroup, this.getFeatureName(), {});
  };

  getFeatureSchema = () => get(this.getFeature(), 'schema', {});

  getFeatureAttributes = () => get(this.getFeatureSchema(), 'attributes', []);

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

  handleDeleteGroupAttribute = attrToDelete => {
    const { deleteGroupAttribute } = this.props;

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
  };

  handleGoBack = () => this.props.history.goBack();

  isUpdatingTempFeature = () => {
    const { groups } = this.props;
    const currentData = groups.find(d => d.name === this.getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  render() {
    const {
      canOpenModal,
      history: { push },
    } = this.props;

    const attributes = this.getFeatureAttributes();
    const attributesNumber = this.getFeatureAttributesLength();
    let listTitle = `${pluginId}.table.attributes.title.${
      attributesNumber > 1 ? 'plural' : 'singular'
    }`;

    const buttonProps = {
      kind: 'secondaryHotlineAdd',
      label: `${pluginId}.button.attributes.add`,
      onClick: this.handleClick,
    };

    return (
      <>
        <BackHeader onClick={this.handleGoBack} />
        <ViewContainer
          {...this.props}
          featureType={this.featureType}
          headerTitle={this.getFeatureHeaderTitle()}
          headerDescription={this.getFeatureHeaderDescription()}
        >
          {attributesNumber === 0 ? (
            <EmptyAttributesBlock
              description={`${pluginId}.home.emptyAttributes.description.${
                this.featureType
              }`}
              id="openAddAttr"
              label="content-type-builder.button.attributes.add"
              title="content-type-builder.home.emptyAttributes.title"
            />
          ) : (
            <ListWrapper>
              <ListHeader
                title={listTitle}
                titleValues={{ number: attributesNumber }}
                relationTitle={listTitle}
                relationTitleValues={{ number: attributesNumber }}
                button={{ ...buttonProps }}
              />
              <List>
                <table>
                  <tbody>
                    {attributes.map(attribute => (
                      <ListRow
                        key={attribute.name}
                        canOpenModal={canOpenModal}
                        context={this.context}
                        deleteAttribute={this.handleDeleteGroupAttribute}
                        {...attribute}
                        type={attribute.type}
                        isTemporary={false}
                        onClickGoTo={() => {}}
                      />
                    ))}
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
          isOpen={this.getModalType() === 'chooseAttributes'}
          push={push}
        />
      </>
    );
  }
}

GroupPage.propTypes = {
  deleteGroupAttribute: PropTypes.func.isRequired,
  groups: PropTypes.array.isRequired,
  history: PropTypes.shape({
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

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteGroupAttribute,
    },
    dispatch
  );
}

const withConnect = connect(
  null,
  mapDispatchToProps
);

export default compose(withConnect)(GroupPage);
