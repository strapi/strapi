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
import { isEmpty, isUndefined, map, replace, split } from 'lodash';
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
    this.init(this.props);
    // this.init(this.props.match.params.slug);
  }

  componentWillReceiveProps(nextProps) {
    const locationChanged = nextProps.location.pathname !== this.props.location.pathname;

    if (locationChanged) {
      this.init(nextProps);
      // this.init(nextProps.match.params.slug);
    }

    if (!isEmpty(nextProps.location.search) && this.props.location.search !== nextProps.location.search) {
      this.props.loadRecords();
    }

  }

  init(props) {
    const slug = props.match.params.slug;
    // Set current model name
    this.props.setCurrentModelName(slug.toLowerCase());

    const searchParams = split(replace(props.location.search, '?', ''), '&');

    const sort = isEmpty(props.location.search) ?
      this.props.models[slug.toLowerCase()].primaryKey || 'id' :
      replace(searchParams[2], 'sort=', '');

    if (!isEmpty(props.location.search)) {
      this.props.changePage(parseInt(replace(searchParams[0], 'page=', ''), 10));
      this.props.changeLimit(parseInt(replace(searchParams[1], 'limit=', ''), 10));
    }

    this.props.changeSort(sort);

    // Load records
    this.props.loadRecords();

    // Get the records count
    this.props.loadCount();

    // Define the `create` route url
    this.addRoute = `${this.props.match.path.replace(':slug', slug)}/create`;
  }

  handleChangeLimit = ({ target }) => {
    this.props.changeLimit(parseInt(target.value));
    router.push({
      pathname: this.props.location.pathname,
      search: `?page=${this.props.currentPage}&limit=${target.value}&sort=${this.props.sort}`,
    });
  }

  handleChangePage = (page) => {
    router.push({
      pathname: this.props.location.pathname,
      search: `?page=${page}&limit=${this.props.limit}&sort=${this.props.sort}`,
    });
    this.props.changePage(page);
  }

  handleChangeSort = (sort) => {
    router.push({
      pathname: this.props.location.pathname,
      search: `?page=${this.props.currentPage}&limit=${this.props.limit}&sort=${sort}`,
    });
    this.props.changeSort(sort);
  }

  handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    this.props.deleteRecord(this.state.target, this.props.currentModelName);
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
    } else {
      // Detect current model structure from models list
      const currentModel = this.props.models[this.props.currentModelName];

      // Define table headers
      const tableHeaders = map(this.props.schema[this.props.currentModelName].list, (value) => ({
        name: value,
        label: this.props.schema[this.props.currentModelName].fields[value].label,
        type: this.props.schema[this.props.currentModelName].fields[value].type,
      }));

      tableHeaders.splice(0, 0, { name: currentModel.primaryKey || 'id', label: 'Id', type: 'string' });

      content = (
        <Table
          records={this.props.records}
          route={this.props.match}
          routeParams={this.props.match.params}
          headers={tableHeaders}
          changeSort={this.handleChangeSort}
          sort={this.props.sort}
          history={this.props.history}
          primaryKey={currentModel.primaryKey || 'id'}
          handleDelete={this.toggleModalWarning}
          redirectUrl={`?redirectUrl=/plugins/content-manager/${this.props.currentModelName.toLowerCase()}/?page=${this.props.currentPage}&limit=${this.props.limit}&sort=${this.props.sort}`}
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
        kind: 'primaryAddShape',
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
                handleConfirm={this.handleDelete}
              />
              <TableFooter
                limit={this.props.limit}
                currentPage={this.props.currentPage}
                changePage={this.handleChangePage}
                count={this.props.count}
                className="push-lg-right"
                handleChangeLimit={this.handleChangeLimit}
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
  loadingRecords: PropTypes.bool.isRequired,
  loadRecords: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  models: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  records: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.bool,
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
