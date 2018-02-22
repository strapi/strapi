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
import { capitalize, get, isUndefined, map, toInteger } from 'lodash';
import cn from 'classnames';

// App selectors
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PageFooter from 'components/PageFooter';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';

// Components from the plugin itself
import Table from 'components/Table';

// Utils located in `strapi/packages/strapi-helper-plugin/lib/src/utils`;
import getQueryParameters from 'utils/getQueryParameters';
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import {
  changeParams,
  deleteData,
  getData,
  setParams,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectListPage from './selectors';

import styles from './styles.scss';

export class ListPage extends React.Component {
  state = { showWarning: false, target: '' };

  componentDidMount() {
    this.getData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== this.props.location.pathname) {
      this.getData(nextProps);
    }

    if (nextProps.location.search !== this.props.location.search) {
      this.getData(nextProps);
    }
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
    const source = getQueryParameters(props.location.search, 'source');
    const limit = toInteger(getQueryParameters(props.location.search, 'limit')) || 10;
    const page = toInteger(getQueryParameters(props.location.search, 'page')) || 1;
    const sort = this.findPageSort(props);
    const params = { limit, page, sort };

    this.props.setParams(params);
    this.props.getData(props.match.params.slug, source);
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
      props.models,
      ['models', slug.toLowerCase(), 'primaryKey'],
    );
    // Check if the model is in a plugin
    const pluginModelPrimaryKey = get(
      props.models.plugins,
      [source, 'models', slug.toLowerCase(), 'primaryKey'],
    );

    return getQueryParameters(props.location.search, 'sort') || modelPrimaryKey || pluginModelPrimaryKey || 'id';
  }

  handleChangeParams = (e) => {
    const { history, listPage: { params } } = this.props;
    const search = e.target.name === 'params.limit' ?
      `page=${params.currentPage}&limit=${e.target.value}&sort=${params.sort}`
      : `page=${e.target.value}&limit=${params.limit}&sort=${params.sort}`;
    this.props.history.push({
      pathname: history.pathname,
      search,
    });

    this.props.changeParams(e);
  }

  handleChangeSort = (sort) => {
    const target = {
      name: 'params.sort',
      value: sort,
    };

    const { listPage: { params } } = this.props;

    this.props.history.push({
      pathname: this.props.location.pathname,
      search: `?page=${params.page}&limit=${params.limit}&sort=${sort}&source=${this.getSource()}`,
    });
    this.props.changeParams({ target });
  }

  handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.props.deleteData(this.state.target, this.getCurrentModelName(), this.getSource());
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
    const { listPage, listPage: { params } } = this.props;
    const pluginHeaderActions = [
      {
        label: 'content-manager.containers.List.addAnEntry',
        labelValues: {
          entity: capitalize(this.props.match.params.slug) || 'Content Manager',
        },
        kind: 'primaryAddShape',
        onClick: () => this.props.history.push({
          pathname: `${this.props.location.pathname}/create`,
          search: `?source=${this.getSource()}`,
        }),
      },
    ];

    return (
      <div>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            actions={pluginHeaderActions}
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
            <div className="col-md-12">
              <Table
                records={listPage.records}
                route={this.props.match}
                routeParams={this.props.match.params}
                headers={this.generateTableHeaders()}
                onChangeSort={this.handleChangeSort}
                sort={listPage.params.sort}
                history={this.props.history}
                primaryKey={this.getCurrentModel().primaryKey || 'id'}
                handleDelete={this.toggleModalWarning}
                redirectUrl={`?redirectUrl=/plugins/content-manager/${this.getCurrentModelName().toLowerCase()}?page=${params.page}&limit=${params.limit}&sort=${params.sort}&source=${this.getSource()}`}
              />
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
              <PageFooter
                count={listPage.count}
                onChangeParams={this.handleChangeParams}
                params={listPage.params}
                style={{ marginTop: '2.9rem', padding: '0 15px 0 15px' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ListPage.propTypes = {
  changeParams: PropTypes.func.isRequired,
  deleteData: PropTypes.func.isRequired,
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
      deleteData,
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
