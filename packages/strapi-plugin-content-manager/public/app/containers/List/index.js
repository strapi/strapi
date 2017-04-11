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
import Pagination from 'components/Pagination';
import LimitSelect from 'components/LimitSelect';

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
  makeSelectCount,
  makeSelectCurrentPage,
  makeSelectLimit,
  makeSelectSort,
  makeSelectLoadingCount,
} from './selectors';

import {
  makeSelectModels,
} from 'containers/App/selectors';

export class List extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentWillMount() {
    this.props.setCurrentModelName(this.props.routeParams.slug.toLowerCase());
    this.props.loadRecords();
    this.props.loadCount();
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
    } else {
      // Detect current model structure from models list
      const currentModel = this.props.models[this.props.currentModelName];

      // Hide non displayed attributes
      const displayedAttributes = _.pickBy(currentModel.attributes, (attr) => (!attr.admin || attr.admin.displayed !== false));

      // Define table headers
      const tableHeaders = _.map(displayedAttributes, (value, key) => ({
        name: key,
        label: key,
        type: value.type,
      }));

      // Add `id` column
      tableHeaders.unshift({
        name: 'id',
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
        />
      );
    }

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader title={{
            id: 'plugin-content-manager-title',
            defaultMessage: `Content Manager > ${this.props.routeParams.slug}`
          }} description={{
            id: 'plugin-content-manager-description',
            defaultMessage: `Manage your ${this.props.routeParams.slug}`
          }} noActions={false}>
          </PluginHeader>
          <Container>
            {content}
            <div className="row">
              <div className="col-md-6">
                <Pagination
                  limit={this.props.limit}
                  currentPage={this.props.currentPage}
                  changePage={this.props.changePage}
                  count={this.props.count}
                />
              </div>
              <div className="col-md-6">
                <div className="pull-xs-right">
                  <LimitSelect
                    className="push-lg-right"
                    onLimitChange={this.props.onLimitChange}
                    limit={this.props.limit}
                  />
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>
    );
  }
}

List.contextTypes = {
  router: React.PropTypes.object.isRequired
};

List.propTypes = {
  setCurrentModelName: React.PropTypes.func,
  records: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.bool,
  ]),
  loadRecords: React.PropTypes.func,
  loadingRecords: React.PropTypes.bool,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  currentPage: React.PropTypes.number,
  limit: React.PropTypes.number,
  sort: React.PropTypes.string,
  currentModelName: React.PropTypes.string,
  changeSort: React.PropTypes.func,
  onLimitChange: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    setCurrentModelName: (modelName) => dispatch(setCurrentModelName(modelName)),
    loadRecords: () => dispatch(loadRecords()),
    loadCount: () => dispatch(loadCount()),
    changePage: (page) => {
      dispatch(changePage(page));
      dispatch(loadRecords());
      dispatch(loadCount());
    },
    changeSort: (sort) => {
      dispatch(changeSort(sort));
      dispatch(loadRecords());
    },
    onLimitChange: (e) => {
      const newLimit = Number(e.target.value);
      dispatch(changeLimit(newLimit));
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
});

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(List));
