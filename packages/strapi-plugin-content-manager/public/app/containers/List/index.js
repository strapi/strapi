/*
 *
 * List
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import _ from 'lodash';

import Container from 'components/Container';
import Table from 'components/Table';
import TableFooter from 'components/TableFooter';

import styles from './styles.scss';

import {
  setCurrentModelName,
  loadRecords,
  loadCount,
  changePage,
  changeSort,
  changeLimit,
} from './actions';

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

import { makeSelectModels } from 'containers/App/selectors';

export class List extends React.Component {
  componentWillMount() {
    // Init the view
    this.init(this.props.routeParams.slug);
  }

  componentWillReceiveProps(nextProps) {
    // Check if the current slug changed in the url
    const locationChanged =
      nextProps.location.pathname !== this.props.location.pathname;

    // If the location changed, init the view
    if (locationChanged) {
      this.init(nextProps.params.slug);
    }
  }

  init(slug) {
    // Set current model name
    this.props.setCurrentModelName(slug.toLowerCase());

    // Set default sort value
    this.props.changeSort(this.props.models[slug.toLowerCase()].primaryKey);

    // Load records
    this.props.loadRecords();

    // Get the records count
    this.props.loadCount();

    // Define the `create` route url
    this.addRoute = `${this.props.route.path.replace(':slug', slug)}/create`;
  }

  render() {
    const PluginHeader = this.props.exposedComponents.PluginHeader;

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

      // Hide non displayed attributes
      const displayedAttributes = _.pickBy(
        currentModel.attributes,
        attr => !attr.admin || attr.admin.displayed !== false
      );

      // Define table headers
      const tableHeaders = _.map(displayedAttributes, (value, key) => ({
        name: key,
        label: key,
        type: value.type,
      }));

      // Add the primary key column
      tableHeaders.unshift({
        name: currentModel.primaryKey,
        label: 'ID',
        type: 'string',
      });

      content = (
        <Table
          records={this.props.records}
          route={this.props.route}
          routeParams={this.props.routeParams}
          headers={tableHeaders}
          changeSort={this.props.changeSort}
          sort={this.props.sort}
          history={this.props.history}
          primaryKey={currentModel.primaryKey || 'id'}
        />
      );
    }

    // Define plugin header actions
    const pluginHeaderActions = [
      {
        label: 'Add an entry',
        class: 'btn-primary',
        onClick: () => this.context.router.push(this.addRoute),
      },
    ];

    // Plugin header config
    const pluginHeaderTitle =
      _.upperFirst(this.props.currentModelNamePluralized) || 'Content Manager';
    const pluginHeaderDescription = `Manage your ${this.props.currentModelNamePluralized}`;

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader
            title={{
              id: 'plugin-content-manager-title',
              defaultMessage: `${pluginHeaderTitle}`,
            }}
            description={{
              id: 'plugin-content-manager-description',
              defaultMessage: `${pluginHeaderDescription}`,
            }}
            actions={pluginHeaderActions}
          />
          <Container>
            {content}
            <TableFooter
              limit={this.props.limit}
              currentPage={this.props.currentPage}
              changePage={this.props.changePage}
              count={this.props.count}
              className="push-lg-right"
              onLimitChange={this.props.onLimitChange}
            />
          </Container>
        </div>
      </div>
    );
  }
}

List.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

List.propTypes = {
  setCurrentModelName: React.PropTypes.func.isRequired,
  records: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.bool,
  ]),
  loadRecords: React.PropTypes.func.isRequired,
  loadingRecords: React.PropTypes.bool.isRequired,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  currentPage: React.PropTypes.number.isRequired,
  limit: React.PropTypes.number.isRequired,
  sort: React.PropTypes.string.isRequired,
  currentModelName: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.bool,
  ]),
  currentModelNamePluralized: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.bool,
  ]),
  changeSort: React.PropTypes.func.isRequired,
  onLimitChange: React.PropTypes.func.isRequired,
  count: React.PropTypes.oneOfType([
    React.PropTypes.number,
    React.PropTypes.bool,
  ]),
  exposedComponents: React.PropTypes.object.isRequired,
  loadCount: React.PropTypes.func.isRequired,
  route: React.PropTypes.object.isRequired,
  routeParams: React.PropTypes.object.isRequired,
  location: React.PropTypes.object.isRequired,
  history: React.PropTypes.object.isRequired,
  changePage: React.PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return {
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
});

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(List));
