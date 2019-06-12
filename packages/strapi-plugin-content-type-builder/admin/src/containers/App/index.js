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
import { isEmpty } from 'lodash';

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
      connections,
      groups,
      history: { push },
      location: { pathname, search },
      isLoading,
      models,
      newContentType,
      newGroup,
      onChangeNewContentTypeMainInfos,
      onChangeNewGroupMainInfos,
    } = this.props;

    if (isLoading) {
      return <Loader />;
    }

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
        <ModelForm
          actionType={this.getActionType()}
          activeTab={getQueryParameters(search, 'settingType')}
          allTakenNames={this.getAllGroupsAndModelsNames()}
          cancelNewContentType={() => {}}
          connections={connections}
          createTempContentType={() => {}}
          featureType={this.getFeatureType()}
          modifiedData={
            this.getFeatureType() === 'model' ? newContentType : newGroup
          }
          onChangeNewContentTypeMainInfos={
            this.getFeatureType() === 'model'
              ? onChangeNewContentTypeMainInfos
              : onChangeNewGroupMainInfos
          }
          // onChangeNewContentTypeMainInfos={
          //   this.props.onChangeNewContentTypeMainInfos
          // }
          isOpen={!isEmpty(search)}
          pathname={pathname}
          push={push}
        />
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
  deleteModel: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  groups: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
  onChangeExistingContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeNewContentTypeMainInfos: PropTypes.func.isRequired,
  onChangeNewGroupMainInfos: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  saveEditedAttribute: PropTypes.func.isRequired,
  saveEditedAttributeRelation: PropTypes.func.isRequired,
  setTemporaryAttribute: PropTypes.func.isRequired,
  setTemporaryAttributeRelation: PropTypes.func.isRequired,
  shouldRefetchData: PropTypes.bool,
};

const mapStateToProps = makeSelectApp();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttributeRelation,
      cancelNewContentType,
      clearTemporaryAttributeRelation,
      createTempContentType,
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
