/*
 *
 * List
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import _ from 'lodash';

// Selectors.
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

// Components.
import Table from 'components/Table';
import TableFooter from 'components/TableFooter';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';

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
  constructor(props) {
    super(props);

    this.state = {
      showWarning: false,
    };
  }

  componentDidMount() {
    // Init the view
    this.init(this.props.match.params.slug);
  }

  componentWillReceiveProps(nextProps) {
    const locationChanged = nextProps.location.pathname !== this.props.location.pathname;

    if (locationChanged) {
      this.init(nextProps.match.params.slug);
    }
  }

  init(slug) {
    // Set current model name
    this.props.setCurrentModelName(slug.toLowerCase());

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

    this.props.deleteRecord(this.state, this.props.currentModelName);
    this.setState({ showWarning: false });
  }

  toggleModalWarning = (e) => {
    e.preventDefault();
    e.stopPropagation()

    this.setState({ showWarning: !this.state.showWarning, target: e.target.id });
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
          handleDelete={this.toggleModalWarning}
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
              <PopUpWarning
                isOpen={this.state.showWarning}
                toggleModal={this.toggleModalWarning}
                content={{
                  title: 'content-manager.popUpWarning.title',
                  message: 'content-manager.popUpWarning.bodyMessage.contentType.delete',
                  cancel: 'content-manager.popUpWarning.button.cancel',
                  confirm: 'content-manager.popUpWarning.button.confirm',
                }}
                popUpWarningType={'danger'}
                handleConfirm={this.handleDelete}
              />
              <TableFooter
                limit={this.props.limit}
                currentPage={this.props.currentPage}
                changePage={this.props.changePage}
                count={this.props.count}
                className="push-lg-right"
                handleLimit={this.props.changeLimit}
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
  changeLimit: React.PropTypes.func.isRequired,
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
  return bindActionCreators(
    {
      deleteRecord,
      setCurrentModelName,
      loadRecords,
      loadCount,
      changePage,
      changeSort,
      changeLimit,
    },
    dispatch
  );
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
