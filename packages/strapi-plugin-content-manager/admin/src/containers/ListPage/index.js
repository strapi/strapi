/**
 *
 * ListPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { capitalize, get, map, toInteger } from 'lodash';
import cn from 'classnames';

// App selectors
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';

// Components from the plugin itself
import Table from 'components/Table';

// Utils located in `strapi/packages/strapi-helper-plugin/lib/src/utils`;
import getQueryParameters from 'utils/getQueryParameters';
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import {
  changeParams,
  getData,
  setParams,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectListPage from './selectors';

import styles from './styles.scss';

export class ListPage extends React.Component {
  componentWillMount() {
    // Init search params
    const limit = toInteger(getQueryParameters(this.props.location.search, 'limit')) || 10;
    const page = toInteger(getQueryParameters(this.props.location.search, 'page')) || 1;
    const sort = this.findPageSort(this.props);
    const source = getQueryParameters(this.props.location.search, 'source') || 'content-manager';
    const params = { limit, page, sort, source };
    this.props.setParams(params);
  }

  componentDidMount() {
    this.getData(this.props);
  }

  /**
   * Helper to retrieve the current model data
   * @return {Object} the current model
   */
  getCurrentModel = () => get(this.props.models, ['models', this.getCurrentModelName()]) || get(this.props.models, ['plugins', this.getSource(), 'models', this.getCurrentModelName()]);


  /**
   * Helper to retrieve the current model name
   * @return {String} the current model's name
   */
  getCurrentModelName = () => this.props.match.params.slug;

  /**
   * Function to fetch data
   * @param  {Object} props
   */
  getData = (props) => {
    this.props.getData(props.match.params.slug);
  }

  /**
   * Helper to retrieve the model's source
   * @return {String} the model's source
   */
  getSource = () => getQueryParameters(this.props.location.search, 'source') || 'content-manager';

  /**
   *  Function to generate the Table's headers
   * @return {Array}
   */
  generateTableHeaders = () => {
    const currentSchema = get(this.props.schema, [this.getCurrentModelName()]) || get(this.props.schema, ['plugins', this.getSource(), this.getCurrentModelName()]);
    const tableHeaders = map(currentSchema.list, (value) => ({
      name: value,
      label: currentSchema.fields[value].label,
      type: currentSchema.fields[value].type,
    }));

    tableHeaders.splice(0, 0, { name: this.getCurrentModel().primaryKey || 'id', label: 'Id', type: 'string' });

    return tableHeaders;
  }

  /**
   * [findPageSort description]
   * @param  {Object} props [description]
   * @return {String}      the model's primaryKey
   */
  findPageSort = (props) => {
    const { match: { params: { slug } } } = props;
    const source = this.getSource();
    const modelPrimaryKey = get(
      this.props.models,
      ['models', slug.toLowerCase(), 'primaryKey'],
    );
    // Check if the model is in a plugin
    const pluginModelPrimaryKey = get(
      this.props.models.plugins,
      [source, 'models', slug.toLowerCase(), 'primaryKey'],
    );

    return getQueryParameters(props.location.search, 'sort') || modelPrimaryKey || pluginModelPrimaryKey || 'id';
  }

  pluginHeaderActions = [
    {
      label: 'content-manager.containers.List.addAnEntry',
      labelValues: {
        entity: capitalize(this.props.match.params.slug) || 'Content Manager',
      },
      kind: 'primaryAddShape',
      onClick: () => this.props.history.push({
        pathname: `${this.props.location.pathname}/create`,
        search: `?source=${this.props.listPage.params.source}`,
      }),
    },
  ];

  render() {
    const { listPage, listPage: { params } } = this.props;

    return (
      <div>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            actions={this.pluginHeaderActions}
            description={{
              id: listPage.count > 1 ? 'content-manager.containers.List.pluginHeaderDescription' : 'content-manager.containers.List.pluginHeaderDescription.singular',
              values: {
                label: listPage.count,
              },
            }}
            title={{
              id: listPage.currentModel || 'Content Manager',
            }}
          />
          <div className={cn('row', styles.row)}>
            <div className="col-lg-12">
              <Table
                records={listPage.records}
                route={this.props.match}
                routeParams={this.props.match.params}
                headers={this.generateTableHeaders()}
                onChangeSort={() => {}}
                sort={listPage.params.sort}
                history={this.props.history}
                primaryKey={this.getCurrentModel().primaryKey || 'id'}
                handleDelete={() => {}}
                redirectUrl={`?redirectUrl=/plugins/content-manager/${this.getCurrentModelName().toLowerCase()}?page=${params.page}&limit=${params.limit}&sort=${params.sort}&source=${this.getSource()}`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ListPage.contextTypes = {};

ListPage.defaultProps = {};

ListPage.propTypes = {
  getData: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  listPage: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  models: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  setParams: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeParams,
      getData,
      setParams,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  listPage: makeSelectListPage(),
  models: makeSelectModels(),
  schema: makeSelectSchema(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'listPage', reducer });
const withSaga = injectSaga({ key: 'listPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ListPage);
