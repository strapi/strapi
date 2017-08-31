/*
 *
 * List
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import _ from 'lodash';

// Selectors.
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

// Components.
import Table from 'components/Table';
import TableFooter from 'components/TableFooter';
import PluginHeader from 'components/PluginHeader';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Actions.
import {
  deleteRecord,
} from '../Edit/actions';

// Styles.
import styles from './styles.scss';

// Actions.
import {
  setCurrentModelName,
  loadRecords,
  loadCount,
  changePage,
  changeSort,
  changeLimit,
} from './actions';

// Selectors.
import {
  makeSelectRecords,
  makeSelectLoadingRecords,
  makeSelectCurrentModelName,
  makeSelectCurrentModelNamePluralized,
  makeSelectCount,
  makeSelectCurrentPage,
  makeSelectLimit,
  makeSelectSort,
  makeSelectLoadingCount,
} from './selectors';

import reducer from './reducer';
import saga from './sagas';

export class List extends React.Component {
  componentWillMount() {
    // Init the view
    this.init(this.props.match.params.slug);
  }

  componentWillReceiveProps(nextProps) {
    // Check if the current slug changed in the url
    const locationChanged =
      nextProps.location.pathname !== this.props.location.pathname;

    // If the location changed, init the view
    if (locationChanged) {
      this.init(nextProps.match.params.slug);
    }
  }

  init(slug) {
    // Set current model name
    this.props.setCurrentModelName(slug.toLowerCase());

    // Set default sort value
    this.props.changeSort(this.props.models[slug.toLowerCase()].primaryKey || 'desc');

    // Load records
    this.props.loadRecords();

    // Get the records count
    this.props.loadCount();

    // Define the `create` route url
    this.addRoute = `${this.props.match.path.replace(':slug', slug)}/create`;
  }

  handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    this.props.deleteRecord(e.target.id, this.props.currentModelName);
  }

  render() {
    if (!this.props.currentModelName || !this.props.schema) {
      return <div />;
    }

    let content;
    if (this.props.loadingRecords) {
      content = (
        <div>
          <p>Loading...</p>
        </div>
      );
    } else if (!this.props.records.length) {
      content = <p>No results.</p>;
    } else {
      // Detect current model structure from models list
      const currentModel = this.props.models[this.props.currentModelName];

      // Define table headers
      const tableHeaders = _.map(this.props.schema[this.props.currentModelName].list, (value) => ({
        name: value,
        label: this.props.schema[this.props.currentModelName].fields[value].label,
        type: this.props.schema[this.props.currentModelName].fields[value].type,
      }));

      content = (
        <Table
          records={this.props.records}
          route={this.props.match}
          routeParams={this.props.match.params}
          headers={tableHeaders}
          changeSort={this.props.changeSort}
          sort={this.props.sort}
          history={this.props.history}
          primaryKey={currentModel.primaryKey || 'id'}
          handleDelete={this.handleDelete}
        />
      );
    }

    // Plugin header config
    const pluginHeaderTitle = this.props.schema[this.props.currentModelName].label || 'Content Manager';

    // Define plugin header actions
    const pluginHeaderActions = [
      {
        label: 'content-manager.containers.List.addAnEntry',
        labelValues: {
          entity: pluginHeaderTitle,
        },
        handlei18n: true,
        addShape: true,
        buttonBackground: 'primary',
        buttonSize: 'buttonLg',
        onClick: () => this.context.router.history.push(this.addRoute),
      },
    ];

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader
            title={{
              id: pluginHeaderTitle,
            }}
            description={{
              id: 'content-manager.containers.List.pluginHeaderDescription',
              values: {
                label: this.props.schema[this.props.currentModelName].labelPlural.toLowerCase(),
              },
            }}
            actions={pluginHeaderActions}
          />
          <div className='row'>
            <div className='col-lg-12'>
              {content}
              <TableFooter
                limit={this.props.limit}
                currentPage={this.props.currentPage}
                changePage={this.props.changePage}
                count={this.props.count}
                className="push-lg-right"
                onLimitChange={this.props.onLimitChange}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

List.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

List.propTypes = {
  changePage: React.PropTypes.func.isRequired,
  changeSort: React.PropTypes.func.isRequired,
  count: React.PropTypes.oneOfType([
    React.PropTypes.number,
    React.PropTypes.bool,
  ]).isRequired,
  currentModelName: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.bool,
  ]).isRequired,
  currentPage: React.PropTypes.number.isRequired,
  deleteRecord: React.PropTypes.func.isRequired,
  history: React.PropTypes.object.isRequired,
  limit: React.PropTypes.number.isRequired,
  loadCount: React.PropTypes.func.isRequired,
  loadingRecords: React.PropTypes.bool.isRequired,
  loadRecords: React.PropTypes.func.isRequired,
  location: React.PropTypes.object.isRequired,
  match: React.PropTypes.object.isRequired,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  onLimitChange: React.PropTypes.func.isRequired,
  records: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.bool,
  ]).isRequired,
  // route: React.PropTypes.object.isRequired,
  schema: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.object,
  ]).isRequired,
  setCurrentModelName: React.PropTypes.func.isRequired,
  sort: React.PropTypes.string.isRequired,
};

function mapDispatchToProps(dispatch) {
  return {
    deleteRecord: (id, modelName) => dispatch(deleteRecord(id, modelName)),
    setCurrentModelName: modelName => dispatch(setCurrentModelName(modelName)),
    loadRecords: () => dispatch(loadRecords()),
    loadCount: () => dispatch(loadCount()),
    changePage: page => {
      dispatch(changePage(page));
      dispatch(loadRecords());
      dispatch(loadCount());
    },
    changeSort: sort => {
      dispatch(changeSort(sort));
      dispatch(loadRecords());
    },
    onLimitChange: e => {
      const newLimit = Number(e.target.value);
      dispatch(changeLimit(newLimit));
      dispatch(changePage(1));
      dispatch(loadRecords());
      e.target.blur();
    },
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  records: makeSelectRecords(),
  loadingRecords: makeSelectLoadingRecords(),
  count: makeSelectCount(),
  loadingCount: makeSelectLoadingCount(),
  models: makeSelectModels(),
  currentPage: makeSelectCurrentPage(),
  limit: makeSelectLimit(),
  sort: makeSelectSort(),
  currentModelName: makeSelectCurrentModelName(),
  currentModelNamePluralized: makeSelectCurrentModelNamePluralized(),
  schema: makeSelectSchema(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'list', reducer });
const withSaga = injectSaga({ key: 'list', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(List);
