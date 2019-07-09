import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get } from 'lodash';

import pluginId from '../../pluginId';

import ViewContainer from '../ViewContainer';
import AttributesModalPicker from '../AttributesPickerModal';

import ListRow from '../../components/ListRow';

import {
  BackHeader,
  Button,
  EmptyAttributesBlock,
  getQueryParameters,
  List,
  ListHeader,
  ListWrapper,
  PopUpWarning,
} from 'strapi-helper-plugin';

import { deleteGroupAttribute } from '../App/actions';

/* eslint-disable no-extra-boolean-cast */
export class GroupPage extends React.Component {
  state = { attrToDelete: null, showWarning: false };
  featureType = 'group';

  displayNotificationCTNotSaved = () =>
    strapi.notification.info(
      `${pluginId}.notification.info.contentType.creating.notSaved`
    );

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

  handleClickOnTrashIcon = attrToDelete => {
    const { emitEvent } = this.context;
    const { canOpenModal } = this.props;

    if (canOpenModal || this.isUpdatingTempFeature()) {
      this.setState({ showWarning: true, attrToDelete });
      emitEvent('willDeleteFieldOfContentType');
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

  isUpdatingTempFeature = () => {
    const { groups } = this.props;
    const currentData = groups.find(d => d.name === this.getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  toggleModalWarning = () =>
    this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  renderListRow = (attribute, index) => {
    const { canOpenModal } = this.props;

    return (
      <ListRow
        {...attribute}
        attributeId={index}
        canOpenModal={canOpenModal}
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
      history: { push },
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
      onClick: () => {},
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
              description={`${pluginId}.home.emptyAttributes.description.${this.featureType}`}
              id="openAddAttr"
              label="content-type-builder.button.attributes.add"
              title="content-type-builder.home.emptyAttributes.title"
            />
          ) : (
            <ListWrapper>
              <ListHeader title={title} button={{ ...buttonProps }} />
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
          isOpen={this.getModalType() === 'chooseAttributes'}
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
  canOpenModal: PropTypes.bool,
  deleteGroupAttribute: PropTypes.func.isRequired,
  groups: PropTypes.array.isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
  }),
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
