/*
 *
 * List
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';
import { isEmpty, isUndefined, map, get, toInteger } from 'lodash';
import { router } from 'app';

// Selectors.
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

// Components.
import Table from 'components/Table';
import TableFooter from 'components/TableFooter';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Utils
import getQueryParameters from 'utils/getQueryParameters';

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
    this.init(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.source = getQueryParameters(nextProps.location.search, 'source');

    const locationChanged = nextProps.location.pathname !== this.props.location.pathname;

    if (locationChanged) {
      this.init(nextProps);
    }

    if (!isEmpty(nextProps.location.search) && this.props.location.search !== nextProps.location.search) {
      this.props.loadRecords(getQueryParameters(nextProps.location.search, 'source'));
    }
  }

  init(props) {
    const source = getQueryParameters(props.location.search, 'source');
    const slug = props.match.params.slug;

    // Set current model name
    this.props.setCurrentModelName(slug.toLowerCase());

    const sort = (isEmpty(props.location.search) ?
      get(this.props.models, ['models', slug.toLowerCase(), 'primaryKey']) || get(this.props.models.plugins, [source, 'models', slug.toLowerCase(), 'primaryKey']) :
      getQueryParameters('sort')) || 'id';

    if (!isEmpty(props.location.search)) {
      this.props.changePage(toInteger(getQueryParameters(props.location.search, 'page')), source);
      this.props.changeLimit(toInteger(getQueryParameters(props.location.search, 'limit')), source);
    }

    this.props.changeSort(sort, source);

    // Load records
    this.props.loadRecords(source);

    // Get the records count
    this.props.loadCount(source);

    // Define the `create` route url
    this.addRoute = `${this.props.match.path.replace(':slug', slug)}/create`;
  }

  handleChangeLimit = ({ target }) => {
    const source = getQueryParameters(this.props.location.search, 'source');
    this.props.changeLimit(toInteger(target.value), source);
    router.push({
      pathname: this.props.location.pathname,
      search: `?page=${this.props.currentPage}&limit=${target.value}&sort=${this.props.sort}&source=${source}`,
    });
  }

  handleChangePage = (page) => {
    const source = getQueryParameters(this.props.location.search, 'source');
    router.push({
      pathname: this.props.location.pathname,
      search: `?page=${page}&limit=${this.props.limit}&sort=${this.props.sort}&source=${source}`,
    });
    this.props.changePage(page, source);
  }

  handleChangeSort = (sort) => {
    const source = getQueryParameters(this.props.location.search, 'source');
    router.push({
      pathname: this.props.location.pathname,
      search: `?page=${this.props.currentPage}&limit=${this.props.limit}&sort=${sort}&source=${source}`,
    });
    this.props.changeSort(sort, source);
  }

  handleDelete = (e) => {
    const source = getQueryParameters(this.props.location.search, 'source');
    e.preventDefault();
    e.stopPropagation();

    this.props.deleteRecord(this.state.target, this.props.currentModelName, source);
    this.setState({ showWarning: false });
  }

  toggleModalWarning = (e) => {
    if (!isUndefined(e)) {
      e.preventDefault();
      e.stopPropagation();
      this.setState({
        target: e.target.id,
      });
    }

    this.setState({ showWarning: !this.state.showWarning });
  }

  render() {
    const source = getQueryParameters(this.props.location.search, 'source');
    // Detect current model structure from models list
    const currentModel = get(this.props.models, ['models', this.props.currentModelName]) || get(this.props.models, ['plugins', source, 'models', this.props.currentModelName]);
    const currentSchema = get(this.props.schema, [this.props.currentModelName]) || get(this.props.schema, ['plugins', source, this.props.currentModelName]);

    if (!this.props.currentModelName || !currentSchema) {
      return <div />;
    }

    // Define table headers
    const tableHeaders = map(currentSchema.list, (value) => ({
      name: value,
      label: currentSchema.fields[value].label,
      type: currentSchema.fields[value].type,
    }));

    tableHeaders.splice(0, 0, { name: currentModel.primaryKey || 'id', label: 'Id', type: 'string' });

    const content = (
      <Table
        records={this.props.records}
        route={this.props.match}
        routeParams={this.props.match.params}
        headers={tableHeaders}
        onChangeSort={this.handleChangeSort}
        sort={this.props.sort}
        history={this.props.history}
        primaryKey={currentModel.primaryKey || 'id'}
        handleDelete={this.toggleModalWarning}
        redirectUrl={`?redirectUrl=/plugins/content-manager/${this.props.currentModelName.toLowerCase()}?page=${this.props.currentPage}&limit=${this.props.limit}&sort=${this.props.sort}&source=${source}`}
      />
    );

    // Plugin header config
    const pluginHeaderTitle = currentSchema.label || 'Content Manager';

    // Define plugin header actions
    const pluginHeaderActions = [
      {
        label: 'content-manager.containers.List.addAnEntry',
        labelValues: {
          entity: pluginHeaderTitle,
        },
        kind: 'primaryAddShape',
        onClick: () => this.context.router.history.push({
          pathname: this.addRoute,
          search: `?source=${source}`,
        }),
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
              id: this.props.count > 1 ? 'content-manager.containers.List.pluginHeaderDescription' : 'content-manager.containers.List.pluginHeaderDescription.singular',
              values: {
                label: this.props.count,
              },
            }}
            actions={pluginHeaderActions}
          />
          <div className={`row ${styles.row}`}>
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
                onConfirm={this.handleDelete}
              />
              <TableFooter
                limit={this.props.limit}
                currentPage={this.props.currentPage}
                onChangePage={this.handleChangePage}
                count={this.props.count}
                className="push-lg-right"
                onChangeLimit={this.handleChangeLimit}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

List.contextTypes = {
  router: PropTypes.object.isRequired,
};

List.propTypes = {
  changeLimit: PropTypes.func.isRequired,
  changePage: PropTypes.func.isRequired,
  changeSort: PropTypes.func.isRequired,
  count: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.bool,
  ]).isRequired,
  currentModelName: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]).isRequired,
  currentPage: PropTypes.number.isRequired,
  deleteRecord: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  limit: PropTypes.number.isRequired,
  loadCount: PropTypes.func.isRequired,
  loadRecords: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  models: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  records: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  // route: PropTypes.object.isRequired,
  schema: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object,
  ]).isRequired,
  setCurrentModelName: PropTypes.func.isRequired,
  sort: PropTypes.string.isRequired,
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
