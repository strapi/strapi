/**
 *
 * App
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import { get } from 'lodash';

import { NotFound, getQueryParameters } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import HomePage from '../HomePage';
import ModelForm from '../ModelForm';
import ModelPage from '../ModelPage';
import MenuContext from '../MenuContext';
import GroupPage from '../GroupPage';

import Loader from './Loader';

import {
  addAttributeRelation,
  cancelNewContentType,
  clearTemporaryAttributeRelation,
  createTempContentType,
  createTempGroup,
  deleteGroup,
  deleteModel,
  deleteTemporaryGroup,
  deleteTemporaryModel,
  getData,
  onChangeExistingContentTypeMainInfos,
  onChangeNewContentTypeMainInfos,
  onChangeNewGroupMainInfos,
  onChangeRelation,
  onChangeRelationNature,
  onChangeRelationTarget,
  resetExistingContentTypeMainInfos,
  resetNewContentTypeMainInfos,
  resetProps,
  saveEditedAttribute,
  saveEditedAttributeRelation,
  setTemporaryAttribute,
  setTemporaryAttributeRelation,
  updateTempContentType,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectApp from './selectors';

import styles from './styles.scss';

const ROUTES = [
  {
    component: HomePage,
    to: `/plugins/${pluginId}/:type`,
  },

  {
    component: ModelPage,
    to: `/plugins/${pluginId}/models/:modelName`,
  },
  {
    component: GroupPage,
    to: `/plugins/${pluginId}/groups/:groupName`,
  },
];

export class App extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.getData();
  }

  /* istanbul ignore next */
  componentDidUpdate(prevProps) {
    if (prevProps.shouldRefetchData !== this.props.shouldRefetchData) {
      this.props.getData();
    }
  }

  componentWillUnmount() {
    this.props.resetProps();
  }

  canOpenModal = () => {
    const { groups, models } = this.props;

    return (
      models.every(model => model.isTemporary === false) &&
      groups.every(group => group.isTemporary === false)
    );
  };

  getSearch = () => this.props.location.search;

  getActionType = () => {
    return getQueryParameters(this.getSearch(), 'actionType');
  };

  getAllGroupsAndModelsNames = () => {
    const { models, groups } = this.props;

    return models
      .map(model => model.name)
      .concat(groups.map(group => group.uid));
  };

  getFeatureType = () => getQueryParameters(this.getSearch(), 'modalType');

  getFormDataForModel = () => {
    const { modifiedData, newContentType } = this.props;

    if (this.isUpdatingTemporaryModel()) {
      return newContentType;
    }

    return get(modifiedData, this.getFeatureNameFromSearch(), {});
  };

  getFeatureNameFromSearch = () =>
    getQueryParameters(this.getSearch(), 'modelName');

  isUpdatingTemporaryModel = (modelName = this.getFeatureNameFromSearch()) => {
    const { models } = this.props;

    const currentModel = models.find(model => model.name === modelName) || {
      isTemporary: true,
    };

    const { isTemporary } = currentModel;

    return isTemporary;
  };

  isUpdatingTemporaryFeature = (
    groupName = this.getFeatureNameFromSearch()
  ) => {
    const { groups } = this.props;

    const currentGroup = groups.find(group => group.uid === groupName) || {
      isTemporary: true,
    };

    const { isTemporary } = currentGroup;

    return isTemporary;
  };

  renderRoute = route => {
    const { component: Component, to } = route;

    /* istanbul ignore next */
    return (
      <Route
        key={to}
        exact
        path={to}
        render={props => (
          <Component
            {...this.props}
            {...props}
            canOpenModal={this.canOpenModal()}
          />
        )}
      />
    );
  };

  render() {
    const {
      cancelNewContentType,
      connections,
      createTempContentType,
      createTempGroup,
      groups,
      history: { push },
      location: { pathname, search },
      isLoading,
      models,
      newGroup,
      onChangeExistingContentTypeMainInfos,
      onChangeNewContentTypeMainInfos,
      onChangeNewGroupMainInfos,
      resetExistingContentTypeMainInfos,
      resetNewContentTypeMainInfos,
      updateTempContentType,
    } = this.props;

    if (isLoading) {
      return <Loader />;
    }

    const featureForms = [
      {
        actionType: this.getActionType(),
        activeTab: getQueryParameters(search, 'settingType'),
        allTakenNames: this.getAllGroupsAndModelsNames(),
        cancelNewFeatureType: cancelNewContentType,
        connections,
        createTempFeatureType: createTempContentType,
        featureToEditName: this.getFeatureNameFromSearch(),
        featureType: 'model',
        isOpen: getQueryParameters(search, 'modalType') === 'model',
        isUpdatingTemporaryFeatureType: this.isUpdatingTemporaryModel(),
        modifiedData: this.getFormDataForModel(),
        onChangeExistingFeatureTypeMainInfos: onChangeExistingContentTypeMainInfos,
        onChangeNewFeatureTypeMainInfos: onChangeNewContentTypeMainInfos,
        pathname,
        push,
        resetExistingFeatureTypeMainInfos: resetExistingContentTypeMainInfos,
        resetNewFeatureTypeMainInfos: resetNewContentTypeMainInfos,
        updateTempFeatureType: updateTempContentType,
      },
      {
        actionType: this.getActionType(),
        activeTab: getQueryParameters(search, 'settingType'),
        allTakenNames: this.getAllGroupsAndModelsNames(),
        cancelNewFeatureType: () => {},
        connections,
        createTempFeatureType: createTempGroup,
        featureToEditName: this.getFeatureNameFromSearch(),
        featureType: 'group',
        isOpen: getQueryParameters(search, 'modalType') === 'group',
        isUpdatingTemporaryFeatureType: this.isUpdatingTemporaryFeature(),
        modifiedData: newGroup,
        onChangeExistingFeatureTypeMainInfos: () => {},
        onChangeNewFeatureTypeMainInfos: onChangeNewGroupMainInfos,
        pathname,
        push,
        resetExistingFeatureTypeMainInfos: () => {},
        resetNewFeatureTypeMainInfos: () => {},
        updateTempFeatureType: () => {},
      },
    ];

    return (
      <MenuContext.Provider
        value={{
          canOpenModal: this.canOpenModal(),
          groups,
          models,
          push,
        }}
      >
        <div className={styles.app}>
          <Switch>
            {ROUTES.map(this.renderRoute)}
            <Route component={NotFound} />
          </Switch>
        </div>
        {featureForms.map(feature => (
          <ModelForm key={feature.featureType} {...feature} />
        ))}
      </MenuContext.Provider>
    );
  }
}

App.defaultProps = {
  shouldRefetchData: false,
};

App.propTypes = {
  addAttributeRelation: PropTypes.func.isRequired,
  cancelNewContentType: PropTypes.func.isRequired,
  connections: PropTypes.array.isRequired,
  createTempContentType: PropTypes.func.isRequired,
  createTempGroup: PropTypes.func.isRequired,
  deleteModel: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  groups: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  location: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
  modifiedData: PropTypes.object.isRequired,
  newContentType: PropTypes.object.isRequired,
  newGroup: PropTypes.object.isRequired,
  onChangeExistingContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeNewContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeNewGroupMainInfos: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  saveEditedAttribute: PropTypes.func.isRequired,
  saveEditedAttributeRelation: PropTypes.func.isRequired,
  setTemporaryAttribute: PropTypes.func.isRequired,
  setTemporaryAttributeRelation: PropTypes.func.isRequired,
  resetExistingContentTypeMainInfos: PropTypes.func.isRequired,
  resetNewContentTypeMainInfos: PropTypes.func.isRequired,
  shouldRefetchData: PropTypes.bool,
  updateTempContentType: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectApp();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeRelation,
      cancelNewContentType,
      clearTemporaryAttributeRelation,
      createTempContentType,
      createTempGroup,
      deleteGroup,
      deleteModel,
      deleteTemporaryGroup,
      deleteTemporaryModel,
      getData,
      onChangeExistingContentTypeMainInfos,
      onChangeNewContentTypeMainInfos,
      onChangeNewGroupMainInfos,
      onChangeRelation,
      onChangeRelationNature,
      onChangeRelationTarget,
      resetExistingContentTypeMainInfos,
      resetNewContentTypeMainInfos,
      resetProps,
      saveEditedAttribute,
      saveEditedAttributeRelation,
      setTemporaryAttribute,
      setTemporaryAttributeRelation,
      updateTempContentType,
    },
    dispatch
  );
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);
const withReducer = strapi.injectReducer({ key: 'app', reducer, pluginId });
const withSaga = strapi.injectSaga({ key: 'app', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect
)(App);
