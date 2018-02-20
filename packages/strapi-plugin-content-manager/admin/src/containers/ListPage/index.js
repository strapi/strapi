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
import { capitalize, get, toInteger } from 'lodash';
import cn from 'classnames';

// App selectors
import { makeSelectModels } from 'containers/App/selectors';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';

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

  getData = (props) => {
    this.props.getData(props.match.params.slug);
  }

  /**
   * [findPageSort description]
   * @param  {Object} props [description]
   * @return {String}      the model's primaryKey
   */
  findPageSort = (props) => {
    const { match: { params: { slug } } } = props;
    const source = getQueryParameters(props.location.search, 'source');
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
        search: `?source=${this.props.listPage.source}`,
      }),
    },
  ];

  render() {
    const { listPage } = this.props;
    console.log(this.props);
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
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'listPage', reducer });
const withSaga = injectSaga({ key: 'listPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ListPage);
