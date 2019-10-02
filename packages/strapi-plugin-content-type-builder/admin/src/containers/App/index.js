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

import ModelForm from '../ModelForm';
import ModelPage from '../ModelPage';
import MenuContext from '../MenuContext';
import GroupPage from '../GroupPage';

import Loader from './Loader';

import BackButton from '../../components/BackButton';

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
  onChangeExistingGroupMainInfos,
  onChangeNewContentTypeMainInfos,
  onChangeNewGroupMainInfos,
  onChangeRelation,
  onChangeRelationNature,
  onChangeRelationTarget,
  resetExistingContentTypeMainInfos,
  resetNewContentTypeMainInfos,
  resetExistingGroupMainInfos,
  resetProps,
  saveEditedAttribute,
  saveEditedAttributeRelation,
  setTemporaryAttribute,
  setTemporaryAttributeRelation,
  updateTempContentType,
  updateTempGroup,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectApp from './selectors';

import styles from './styles.scss';

const ROUTES = [
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
  state = {
    routerHistory: [],
    historyCount: 1,
  };

  componentDidMount() {
    this.props.getData();
  }

  /* istanbul ignore next */
  componentDidUpdate(prevProps) {
    if (prevProps.shouldRefetchData !== this.props.shouldRefetchData) {
      this.props.getData();
    }
    if (prevProps.location !== this.props.location) {
      if (prevProps.location.pathname !== this.getPathname()) {
        this.addRouterHistory(prevProps.location.pathname);
      } else {
        this.increaseHistoryCount();
      }
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

  addRouterHistory = pathname => {
    if (this.getLastPathname() !== this.getPathname()) {
      this.setState(prevState => {
        return {
          routerHistory: [...prevState.routerHistory, pathname],
          historyCount: prevState.historyCount + 1,
        };
      });
    }
  };

  increaseHistoryCount = () => {
    this.setState(prevState => {
      return {
        routerHistory: [...prevState.routerHistory],
        historyCount: prevState.historyCount + 1,
      };
    });
  };

  removeRouterHistory = () => {
    const array = [...this.state.routerHistory];
    const index = array.length - 1;

    if (index !== -1) {
      array.splice(index, 1);
      this.setState(prevState => {
        return {
          routerHistory: array,
          historyCount: prevState.historyCount + 1,
        };
      });
    }
  };

  getSearch = () => this.props.location.search;

  getPathname = () => this.props.location.pathname;

  getLastPathname = () => {
    const { routerHistory } = this.state;

    return routerHistory[routerHistory.length - 1];
  };

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

  getFormDataForGroup = () => {
    const { modifiedDataGroup, newGroup } = this.props;

    if (this.isUpdatingTemporaryFeature()) {
      return newGroup;
    }

    return get(modifiedDataGroup, this.getFeatureNameFromSearch(), {});
  };

  getFeatureNameFromSearch = () =>
    getQueryParameters(this.getSearch(), `${this.getFeatureType()}Name`);

  handleGoBack = async () => {
    const { history } = this.props;
    const { routerHistory, historyCount } = this.state;

    await this.wait();

    if (routerHistory.length > 0) {
      history.push(this.getLastPathname());
      this.removeRouterHistory();
    } else {
      history.go(-historyCount);
    }
  };

  wait = async () => {
    return new Promise(resolve => setTimeout(resolve, 200));
  };

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
      location: { search },
      isLoading,
      models,
      onChangeExistingContentTypeMainInfos,
      onChangeExistingGroupMainInfos,
      onChangeNewContentTypeMainInfos,
      onChangeNewGroupMainInfos,
      resetExistingContentTypeMainInfos,
      resetExistingGroupMainInfos,
      resetNewContentTypeMainInfos,
      updateTempContentType,
      updateTempGroup,
    } = this.props;

    if (isLoading) {
      return <Loader />;
    }

    const featureForms = [
      {
        actionType: this.getActionType(),
        activeTab: getQueryParameters(search, 'settingType'),
        allTakenNames: this.getAllGroupsAndModelsNames(),
        cancelNewFeature: cancelNewContentType,
        connections,
        createTempFeature: createTempContentType,
        featureToEditName: this.getFeatureNameFromSearch(),
        featureType: 'model',
        isOpen: getQueryParameters(search, 'modalType') === 'model',
        isUpdatingTemporaryFeature: this.isUpdatingTemporaryModel(),
        modifiedData: this.getFormDataForModel(),
        onChangeExistingFeatureMainInfos: onChangeExistingContentTypeMainInfos,
        onChangeNewFeatureMainInfos: onChangeNewContentTypeMainInfos,
        pathname: this.getPathname(),
        push,
        resetExistingFeatureMainInfos: resetExistingContentTypeMainInfos,
        resetNewFeatureMainInfos: resetNewContentTypeMainInfos,
        updateTempFeature: updateTempContentType,
      },
      {
        actionType: this.getActionType(),
        activeTab: getQueryParameters(search, 'settingType'),
        allTakenNames: this.getAllGroupsAndModelsNames(),
        cancelNewFeature: () => {},
        createTempFeature: createTempGroup,
        featureToEditName: this.getFeatureNameFromSearch(),
        featureType: 'group',
        isOpen: getQueryParameters(search, 'modalType') === 'group',
        isUpdatingTemporaryFeature: this.isUpdatingTemporaryFeature(),
        modifiedData: this.getFormDataForGroup(),
        onChangeExistingFeatureMainInfos: onChangeExistingGroupMainInfos,
        onChangeNewFeatureMainInfos: onChangeNewGroupMainInfos,
        pathname: this.getPathname(),
        push,
        resetExistingFeatureMainInfos: resetExistingGroupMainInfos,
        resetNewFeatureMainInfos: () => {},
        updateTempFeature: updateTempGroup,
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
          <BackButton onClick={this.handleGoBack}></BackButton>
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
  modifiedDataGroup: PropTypes.object.isRequired,
  newContentType: PropTypes.object.isRequired,
  newGroup: PropTypes.object.isRequired,
  onChangeExistingContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeExistingGroupMainInfos: PropTypes.func.isRequired,
  onChangeNewContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeNewGroupMainInfos: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  saveEditedAttribute: PropTypes.func.isRequired,
  saveEditedAttributeRelation: PropTypes.func.isRequired,
  setTemporaryAttribute: PropTypes.func.isRequired,
  setTemporaryAttributeRelation: PropTypes.func.isRequired,
  resetExistingContentTypeMainInfos: PropTypes.func.isRequired,
  resetExistingGroupMainInfos: PropTypes.func.isRequired,
  resetNewContentTypeMainInfos: PropTypes.func.isRequired,
  shouldRefetchData: PropTypes.bool,
  updateTempContentType: PropTypes.func.isRequired,
  updateTempGroup: PropTypes.func.isRequired,
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
      onChangeExistingGroupMainInfos,
      onChangeNewContentTypeMainInfos,
      onChangeNewGroupMainInfos,
      onChangeRelation,
      onChangeRelationNature,
      onChangeRelationTarget,
      resetExistingContentTypeMainInfos,
      resetNewContentTypeMainInfos,
      resetExistingGroupMainInfos,
      resetProps,
      saveEditedAttribute,
      saveEditedAttributeRelation,
      setTemporaryAttribute,
      setTemporaryAttributeRelation,
      updateTempContentType,
      updateTempGroup,
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
